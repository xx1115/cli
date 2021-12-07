import { GithubServer } from './repo/git/index';
import os from 'os';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import {
  ensureFile,
  pathExists,
  pathExistsSync,
  readJson,
  readJsonSync,
  writeJson,
  writeJsonSync,
} from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import simpleGit, { Options, SimpleGit, TaskOptions } from 'simple-git';
import { Command } from '@/models';
import { Repo } from './repo';
import { asyncGenerator } from '@/utils/async';
import { Logger } from 'npmlog';
import { log } from '@/utils/log';
import semver, { ReleaseType } from 'semver';
import terminalLink from 'terminal-link';
import chalk from 'chalk';

interface CommitCommandParam {
  resetServer: boolean;
  resetToken: boolean;
  resetOwner: boolean;
  production: boolean;
}

export enum RepoEnum {
  GITHUB = 'GITHUB',
  GITEE = 'GITEE',
}

export interface RepoConfig {
  server: RepoEnum;
  token: string;
  ownerType: string;
  belongTo: string;
  [name: string]: any;
}

export interface CommitConfig {
  [name: string]: RepoConfig;
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

const COMMIT_TYPES = [
  { name: 'feat：新功能（feature)', value: 'feat' },
  { name: 'fix：修补bug', value: 'fix' },
  { name: 'docs：文档（documentation)', value: 'docs' },
  { name: 'style： 格式（不影响代码运行的变动)', value: 'style' },
  {
    name: 'refactor：重构（即不是新增功能，也不是修改bug的代码变动)',
    value: 'refactor',
  },
  { name: 'test：增加测试', value: 'test' },
  { name: 'chore：构建过程或辅助工具的变动', value: 'chore' },
];

const VERSION_TYPES = (version: string) => {
  // Return the version incremented by the release type (major, minor, patch, or prerelease), or null if it's not valid.
  return ['patch', 'minor', 'major'].map((value) => ({
    name: `${version} => ${semver.inc(version, value as ReleaseType)}`,
    value,
  }));
};

const VERSION_RELEASE = 'release';
const VERSION_DEVELOP = 'develop';

export class CommitCommand extends Command<CommitCommandParam> {
  branch = '';
  version = '';
  cwd: string;
  private defaultCfg: string;
  private secondCfg: string;
  configPath: string;
  git: SimpleGit;
  repoName: string;
  finalConfig: string;
  RepoInfo: CommitConfig = {};
  gitServer?: Repo;
  user?: GitUserProps;
  orgs: GitOrgProps[] = [];

  constructor(props: CommitCommandParam, log: Logger) {
    super(props, log);
    this.version = '';
    this.cwd = process.cwd();
    this.defaultCfg = join(this.cwd, 'xx.json');
    this.secondCfg = join(this.cwd, 'package.json');
    this.configPath = '';
    this.git = simpleGit(this.cwd);
    this.repoName = basename(this.cwd);
    this.finalConfig = this.defaultCfg;
    this.RepoInfo = {};
  }

  protected async prepare() {
    await this.ensurePkgVersion();
    await this.ensureRepoConfig();
    await this.loadRepoInfo();
    this.log.verbose('prepare', '读取到项目配置信息为', this.RepoInfo);
    if (await this.needSetConfig()) {
      await this.configRepo();
    }
  }

  async configRepo() {
    await this.configServer();
    await this.configToken();
    await this.getUserAndOrg();
    await this.configOwner();
  }

  async getUserAndOrg() {
    const config = this.getRepoConfig();
    if (config.server === RepoEnum.GITHUB) {
      this.gitServer?.setToken(config.token);
    } else if (config.server === RepoEnum.GITEE) {
      // TODO:
    } else {
      throw new Error('目前还不支持这种远程仓库');
    }
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
      this.updateRepoConfig(this.repoName, 'server', gitServer);
      this.log.success(
        'git server 写入成功',
        `${gitServer} => ${this.configPath}`,
      );
    }
    // TODO: add GiteeServer
    this.gitServer = new GithubServer('', this.log);
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
    }
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

  async checkConfigComplete() {
    const config = this.getRepoConfig();
    return config.owner && config.server && config.token;
  }

  /**
   * TBD
   * @deprecated
   * @returns
   */
  async checkLocalAndRemoteAssociated() {
    if (await pathExists(join(this.cwd, '.git'))) {
      this.log.info('git本地已初始化完成', '');
      const remotes = await this.git.getRemotes();
      if (remotes.find((item) => item.name === 'origin')) {
        this.log.info('本地与远端已创建关联', '');
        return true;
      } else {
        this.log.info('本地与远端未创建关联，执行关联部分逻辑', '');
        return false;
      }
    } else {
      this.log.info('git本地未进行初始化，执行初始化和远端关联逻辑', '');
      await this.git.init();
      return false;
    }
  }

  getRepoConfig(): RepoConfig {
    return this.RepoInfo[this.repoName] ?? {};
  }

  getRepoConfigByKey(key: keyof RepoConfig) {
    return this.getRepoConfig()?.[key];
  }

  updateRepoConfig(RepoName: string, key: keyof RepoConfig, value: string) {
    const config: RepoConfig = this.getRepoConfig();
    config[key] = value;
    this.RepoInfo[RepoName] = config;
    writeJsonSync(this.configPath, this.RepoInfo, { spaces: 2 });
  }

  async ensureRepoConfig() {
    this.configPath = join(os.homedir(), '.xxRepo.json');
    if (!existsSync(this.configPath)) {
      await writeJson(
        this.configPath,
        { demo: {} },
        {
          spaces: 2,
        },
      );
    }
  }

  async loadRepoInfo() {
    this.RepoInfo = await readJson(this.configPath);
  }

  private async ensurePkgVersion() {
    if (existsSync(this.defaultCfg)) {
      this.version = (await readJsonSync(this.defaultCfg)).version;
    } else if (existsSync(this.secondCfg)) {
      this.version = (await readJsonSync(this.secondCfg)).version;
      this.finalConfig = this.secondCfg;
    } else {
      await this.addCommitJson();
    }
  }

  private async addCommitJson() {
    await ensureFile(this.finalConfig);
    this.version = '0.0.1';
    const cfg = { version: this.version, name: this.repoName };
    this.log.notice('addCommitJson', 'generate config xx.json', cfg);
    writeJsonSync(this.finalConfig, cfg, {
      spaces: 2,
    });
  }

  protected async init() {
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
        this.git,
        config.belongTo,
        this.repoName,
      );
      log.success('clone', 'clone success!');
      await this.gitServer?.moveFiles(tmp, this.cwd);
      this.log.success('commit', 'finish');
      return;
    }
    this.log.success('init', '本地已与远端建立关联');
  }

  async pushMainRemote() {
    if (!(await this.checkRemoteMain())) {
      this.log.info('远端是一个新的仓库，执行创建主分支并push动作', '');
      await this.git.push('origin', 'main');
    }
  }

  async checkRemoteMain() {
    // Do not show peeled tags or pseudorefs like HEAD in the output.
    return (
      (await this.git.listRemote(['--refs'])).indexOf('refs/heads/main') >= 0
    );
  }

  async pullRemote() {
    if (await this.checkRemoteMain()) {
      this.log.info('pullRemote', '远端已经有主分支，执行拉取动作');
      await this.git.pull('origin', 'main', {
        '--allow-unrelated-histories': null,
      });
    }
  }

  async initCommit() {
    const status = await this.checkConflicted();
    this.log.verbose('initCommit', 'status', status);
    const list = [
      status.not_added,
      status.created,
      status.deleted,
      status.modified,
      status.renamed,
    ];
    if (list.some((status) => status.length > 0)) {
      const gen = asyncGenerator(
        list.map((x) => () => this.git.add(x as unknown as string)),
      );
      // eslint-disable-next-line no-unused-vars
      for await (const _x of gen);
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'commitType',
          message: '请选择本次提交类型',
          default: 'feat',
          choices: COMMIT_TYPES,
        },
        {
          type: 'text',
          name: 'message',
          message: '请输入commit信息',
          validate: function (v) {
            const done = (this as any).async();
            setTimeout(function () {
              if (!v) {
                done('请输入commit信息');
                return;
              }
              done(null, true);
            });
          },
        },
      ]);
      const message = `${answer.commitType}: ${answer.message}`;
      await this.git.commit(message);
      this.log.success(`本地提交成功, message信息为 ${message}`);
    } else {
      this.log.warn('initCommit', '无任何文件改动');
      return true;
    }
  }

  async checkConflicted() {
    this.log.info('checkConflicted', '代码冲突检查');
    const status = await this.git.status();
    if (status.conflicted.length > 0) {
      throw new Error('当前代码存在冲突，请手动处理合并后再试');
    }
    return status;
  }

  async checkStash() {
    log.info('checkStash', '检查stash记录');
    const stashList = await this.git.stashList();
    if (stashList.all.length > 0) {
      await this.git.stash(['pop']);
      this.log.success('stash pop 成功');
    }
  }

  protected async exec() {
    if (await this.whetherContinue()) {
      await this.getCorrectVersion();
      await this.checkStash();
      await this.checkConflicted();
      await this.checkoutBranch(this.branch);
      await this.pullRemoteMainAndBranch();
      if (!(await this.initCommit())) {
        await this.pushRemoteRepo(this.branch);
      }
      if (this.argv.production) {
        await this.addAndPushTag();
      }
    }
  }

  async addAndPushTag() {
    const tagName = `release/${this.version}`;
    await this.git.addTag(tagName);
    this.log.info('addAndPushTag', `创建Tag版本${tagName}成功`);
    await this.git.mergeFromTo(this.branch, 'main');
    this.log.info('addAndPushTag', `将${this.branch}分支合并到主分支`);
    await this.git.push('origin', tagName);
    this.log.info('addAndPushTag', `向远端推送${tagName}成功`);
  }

  async whetherContinue() {
    const local = await this.git.branchLocal();
    if (local.current.startsWith('develop')) {
      this.log.info('whetherContinue', '您当前所在分支为', local.current);
      return true;
    }
    this.log.info('whetherContinue', '您当前并不在develop分支上');
    this.log.info(
      'whetherContinue',
      `如果您此次开发有n次提交，请执行n次${chalk.red(
        'git rebase HEAD^',
      )}将提交弹出到工作区`,
    );
    const ctu = (
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'ctu',
          message: '如已完成或此次开发没有提交过，请输入Y',
        },
      ])
    ).ctu;
    if (ctu) {
      this.log.info('exec', chalk.red('您选择了继续执行'));
    }
  }

  async pushRemoteRepo(branchName: string) {
    this.log.info('pushRemoteRepo', `推送代码至${branchName}分支`);
    await this.git.push('origin', branchName);
    this.log.success('pushRemoteRepo', '推送代码成功');
  }

  async pullRemoteMainAndBranch() {
    this.log.info('pullRemoteMainAndBranch', `合并 [main] -> [${this.branch}]`);
    await this.pullRemoteRepo('main');
    this.log.success('合并远程 [main] 分支代码成功');
    await this.checkConflicted();
    this.log.info('pullRemoteMainAndBranch', '检查远程开发分支');
    const remoteBranchList = await this.getRemoteBranchList();
    if (remoteBranchList.includes(this.version)) {
      this.log.info(
        'pullRemoteMainAndBranch',
        `合并 [${this.branch}] -> [${this.branch}]`,
      );
      await this.pullRemoteRepo(this.branch);
      this.log.success(`合并远程 [${this.branch}] 分支代码成功`);
      await this.checkConflicted();
    } else {
      this.log.success(`不存在远程分支 [${this.branch}]`);
    }
  }

  async pullRemoteRepo(branchName: string, options?: TaskOptions<Options>) {
    this.log.info('pullRemoteRepo', `同步远程${branchName}分支代码`);
    await this.git.pull('origin', branchName, options).catch((err) => {
      this.log.error('pullRemoteRepo', err.message);
    });
  }

  async checkoutBranch(branch: string) {
    const localBranchList = await this.git.branchLocal();
    if (localBranchList.all.includes(branch)) {
      // git checkout branch
      await this.git.checkout(branch);
    } else {
      // git cehckout -b branch
      await this.git.checkoutLocalBranch(branch);
    }
    log.success(`分支切换到${branch}`);
  }

  async getCorrectVersion() {
    this.log.info('getCorrectVersion', '获取代码分支');
    const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0];
    }
    releaseVersion
      ? this.log.verbose(
          'getCorrectVersion',
          '线上最新的版本号是',
          releaseVersion,
        )
      : this.log.verbose('getCorrectVersion', '线上目前没有发布分支');
    const devVersion = this.version;
    if (!releaseVersion) {
      // 第一次创建 远程没有release分支
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else if (semver.gt(this.version, releaseVersion)) {
      // 本地版本大于线上的最大版本，代表是新拉取的分支
      log.info(
        '当前版本大于线上最新版本',
        `${devVersion} >= ${releaseVersion}`,
      );
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else {
      // 线上版本大于本地版本，要对本地版本做更新
      log.info('当前线上版本大于本地版本', `${releaseVersion} > ${devVersion}`);
      const incType = (
        await inquirer.prompt({
          type: 'list',
          name: 'incType',
          message: '自动升级版本，请选择升级版本类型',
          default: 'patch',
          choices: VERSION_TYPES(releaseVersion),
        })
      ).incType;
      const incVersion = semver.inc(releaseVersion, incType);
      this.branch = `${VERSION_DEVELOP}/${incVersion}`;
      this.version = incVersion as string;
      log.verbose('本地开发分支', this.branch);
      this.syncVersionToPackageJson();
    }
  }

  syncVersionToPackageJson() {
    const pkg = readJsonSync(this.finalConfig);
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      writeJsonSync(this.finalConfig, pkg, { spaces: 2 });
      this.log.notice(
        'syncVersionToPackageJson',
        `版本已经更新，记得提交${this.finalConfig}文件`,
      );
    }
  }

  async getRemoteBranchList(type?: string) {
    const remoteList = await this.git.listRemote(['--refs']);
    let reg: RegExp;
    if (type === VERSION_RELEASE) {
      reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
    } else {
      reg = /.+?refs\/heads\/develop\/(\d+\.\d+\.\d+)/g;
    }
    const remoteVersions = remoteList
      .split('\n')
      .map((remote) => {
        const match = reg.exec(remote);
        reg.lastIndex = 0;
        if (match && semver.valid(match[1])) {
          return match[1];
        }
        return undefined;
      })
      .filter(Boolean);
    return (
      remoteVersions &&
      remoteVersions.sort((a, b) => {
        if (semver.lte(a as string, b as string)) {
          if (a === b) return 0;
          return 1;
        } else {
          return -1;
        }
      })
    );
  }
}

export const commitExec = async (...params: [CommitCommandParam, any[]]) => {
  try {
    const [options] = params;
    const command = new CommitCommand(options, log);
    await command.do();
  } catch (e) {
    log.error('commitExec', (e as Error).message);
    console.log(e);
  }
};
