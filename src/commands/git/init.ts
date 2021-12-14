import { join } from 'path';
import { ensureFile, pathExistsSync, writeJson, writeJsonSync } from 'fs-extra';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { SimpleGit } from 'simple-git';
import { Repo } from './repo';
import { Logger } from 'npmlog';
import chalk from 'chalk';
import terminalLink from 'terminal-link';
import { GitBaseCommand, RepoConfig, RepoEnum } from './base';

export interface GitInitCommandParam {
  resetServer: boolean;
  resetToken: boolean;
  resetOwner: boolean;
  production: boolean;
}

export interface GitUserProps {
  login: string;
}

export interface GitOrgProps {
  login: string;
}

export const REPO_OWNER_USER = 'REPO_OWNER_USER';
export const REPO_OWNER_ORG = 'REPO_OWNER_ORG';

const GIT_OWNER_TYPE = [
  {
    name: '个人',
    value: REPO_OWNER_USER,
  },
  {
    name: '组织',
    value: REPO_OWNER_ORG,
  },
];

export class GitInitCommand extends GitBaseCommand<
  Partial<GitInitCommandParam>
> {
  git: SimpleGit;
  gitServer?: Repo;
  user?: GitUserProps;
  orgs: GitOrgProps[] = [];

  constructor(props: Partial<GitInitCommandParam>, log: Logger) {
    super(props, log);
    this.git = simpleGit(this.cwd);
  }

  async prepare() {
    await this.ensurePkgVersion();
    await this.ensureRepoConfig();
    await this.loadRepoInfo();
    this.log.verbose('prepare', '读取到项目配置信息为', this.repoInfo);
  }

  async init() {
    if (await this.needSetConfig()) {
      await this.configRepo();
    } else {
      const config = this.getRepoConfig();
      this.initialGitServer(config);
    }

    const config = this.getRepoConfig();
    // 创建远端仓库
    await this.gitServer?.ensureRemoteRepo(
      config.belongTo,
      this.repoName,
      config.ownerType,
    );
    if (!pathExistsSync(join(this.cwd, '.git'))) {
      await this.git.init();
    }
    const remotes = await this.git.remote([]);
    if (!remotes) {
      const tmp = join(process.env.CLI_HOME_PATH as string, '.tmp', uuidv4());
      this.log.verbose('init', 'move to tmp, path is', tmp);
      await this.gitServer?.moveFiles(this.cwd, tmp);
      this.log.verbose(
        'clone',
        `clone ${this.gitServer?.getRemote(
          config.belongTo,
          this.repoName,
        )} to ${this.cwd}`,
      );
      await this.gitServer?.cloneToLocal(
        this.cwd,
        config.belongTo,
        this.repoName,
      );
      this.log.success('clone', 'clone success!');
      await this.gitServer?.moveFiles(tmp, this.cwd);
      this.log.success('commit', 'finish');
      return;
    }
    this.log.success('init', '本地已与远端建立关联');
  }

  async exec() {
    this.log.success('exec', 'xx git 已初始化完成');
  }

  getRepoConfigByKey(key: keyof RepoConfig) {
    return this.getRepoConfig()?.[key];
  }

  async ensurePkgVersion() {
    if (await this.loadPkgVersion()) {
      await this.addCommitJson();
    }
  }

  async ensureRepoConfig() {
    if (!this.baseConfigExists()) {
      await writeJson(
        this.configPath,
        { demo: {} },
        {
          spaces: 2,
        },
      );
    }
  }

  private async addCommitJson() {
    await ensureFile(this.finalConfig);
    this.version = '0.0.1';
    const cfg = { version: this.version, name: this.repoName };
    this.log.notice(
      'addCommitJson',
      `当前目录下未发现可用于版本控制的配置信息，为您生成${chalk.redBright(
        'xx.json',
      )}`,
      cfg,
    );
    writeJsonSync(this.finalConfig, cfg, {
      spaces: 2,
    });
  }

  async configRepo() {
    await this.configServer();
    await this.configToken();
    await this.getUserAndOrg();
    await this.configOwner();
  }

  async getUserAndOrg() {
    const config = this.getRepoConfig();
    this.gitServer?.setToken(config.token);
    const user = await this.gitServer?.getUser();
    if (!user) throw new Error('用户信息获取失败，请检查token信息');
    const orgs = await this.gitServer?.getOrg();
    if (!orgs) throw new Error('组织信息获取失败，请检查token信息');
    this.log.success(config.server, '用户和组织信息获取成功');
    this.user = user;
    this.orgs = orgs;
  }

  async configServer() {
    const config = this.getRepoConfig();
    this.log.verbose('configServer', '读取到的项目配置信息为', config);
    if (this.argv.resetServer || !config.server) {
      const gitServer = (
        await inquirer.prompt({
          type: 'list',
          name: 'gitServer',
          message: '请选择您想要托管的Git平台',
          default: RepoEnum.GITHUB,
          choices: [
            {
              name: 'Github',
              value: RepoEnum.GITHUB,
            },
            {
              name: 'Gitee',
              value: RepoEnum.GITEE,
            },
          ],
        })
      ).gitServer;
      config.server = gitServer;
      this.updateRepoConfig(this.repoName, 'server', gitServer);
      this.log.success(
        'git server 写入成功',
        `${gitServer} => ${this.configPath}`,
      );
    }
    this.initialGitServer(config);
  }

  async configToken() {
    const config = this.getRepoConfig();
    if (this.argv.resetToken || !config.token) {
      this.log.warn('configToken', `您需要配置token信息`);
      this.log.info(
        'configToken',
        `${terminalLink(
          '请点击参考帮助文档',
          this.gitServer?.getTokenHelpUrl() as string,
        )}`,
      );
      const token = (
        await inquirer.prompt({
          type: 'password',
          name: 'token',
          message: '请将token复制到这里',
          default: '',
        })
      ).token;
      this.updateRepoConfig(this.repoName, 'token', token);
      this.log.success('token写入成功', `${token} -> ${this.configPath}`);
      this.gitServer?.setToken(token);
    }
  }

  updateRepoConfig(RepoName: string, key: keyof RepoConfig, value: string) {
    const config: RepoConfig = this.getRepoConfig();
    config[key] = value;
    this.repoInfo[RepoName] = config;
    writeJsonSync(this.configPath, this.repoInfo, { spaces: 2 });
  }

  async configOwner() {
    const config = this.getRepoConfig();
    if (this.argv.resetOwner || !config.ownerType || !config.belongTo) {
      let ownerType = '';
      let belongTo = '';
      if (this.orgs && this.orgs.length > 0) {
        ownerType = (
          await inquirer.prompt({
            type: 'list',
            name: 'owner',
            message: '请选择远程仓库类型',
            default: REPO_OWNER_USER,
            choices: GIT_OWNER_TYPE,
          })
        ).owner;
      } else {
        // 没有组织直接设置个人
        ownerType = REPO_OWNER_USER;
      }
      this.updateRepoConfig(this.repoName, 'ownerType', ownerType);
      if (ownerType === REPO_OWNER_USER) {
        belongTo = (this.user as GitUserProps).login;
      } else {
        belongTo = (
          await inquirer.prompt({
            type: 'list',
            name: 'belongTo',
            message: '请选择',
            choices: this.orgs.map((item) => ({
              name: item.login,
              value: item.login,
            })),
          })
        ).belongTo;
      }
      this.updateRepoConfig(this.repoName, 'belongTo', belongTo);
    }
  }

  async needSetConfig() {
    return (
      !(await this.checkConfigComplete()) ||
      this.argv.resetOwner ||
      this.argv.resetServer ||
      this.argv.resetToken
    );
  }

  async isValid() {
    // TODO: 提交时先判断是否有初始化过
    // 调用git的api查看xx.json或者package.json是否存在，如果存在，代表已经初始化过
    // 有可能本地是没有.git文件夹的
    // ssh(public key) https(username, password) api(token)
    // https://github.com/:username/:repo
    // server token username
    // valid
    // 当前目录下没有版本号控制文件，则返回无效
    if (await this.loadPkgVersion()) {
      this.log.info('isValid', 'loadPkgVersion false');
      return false;
    }
    // 用户主目录下没有统一配置文件，返回无效
    if (!this.baseConfigExists()) {
      this.log.info('isValid', 'baseConfigExists false');
      return false;
    }
    await this.loadRepoInfo();
    // 配置完整性校验
    if (!(await this.checkConfigComplete())) {
      this.log.info('isValid', 'loadRepoInfo false');
      return false;
    }
    // TODO: 是否含有.git
    // TODO: 配置有效性校验
    return true;
  }
}
