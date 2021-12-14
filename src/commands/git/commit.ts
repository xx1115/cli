import { basename } from 'path';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import inquirer from 'inquirer';
import simpleGit, { Options, SimpleGit, TaskOptions } from 'simple-git';
import { asyncGenerator } from '@/utils/async';
import { Logger } from 'npmlog';
import { log } from '@/utils/log';
import semver, { ReleaseType } from 'semver';
import chalk from 'chalk';
import { GitInitCommand } from './init';
import { GitBaseCommand } from './base';

export interface CommitCommandParam {
  production: boolean;
}

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

export class CommitCommand extends GitBaseCommand<Partial<CommitCommandParam>> {
  branch = '';
  git: SimpleGit;
  repoName: string;

  constructor(props: Partial<CommitCommandParam>, log: Logger) {
    super(props, log);
    this.version = '';
    this.git = simpleGit(this.cwd);
    this.repoName = basename(this.cwd);
  }

  protected async prepare() {
    if (!(await new GitInitCommand({}, this.log).isValid())) {
      throw new Error(
        `请先执行${chalk.redBright('xx git init')}来初始化配置信息`,
      );
    }
    await this.loadPkgVersion();
    await this.loadRepoInfo();
    this.log.verbose('prepare', '读取到项目配置信息为', this.repoInfo);
    const config = this.getRepoConfig();
    this.initialGitServer(config);
  }

  async init() {
    // TODO:
  }

  /**
   * @deprecated
   */
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
    // 提交时候可能会遇到的情况
    // 1、当前开发分支为0.0.1，远端release分支大于等于当前分支
    // 2、当前开发分支为0.0.2, 远端release分支小于当前分支
    // 3、远端没有开发分支
    // const version = await this.getCorrectVersion();
    // this.log.notice('exec', `经过计算，当前开发版本号为${version}`);
    // this.log.warn('exec', 'develop/*.*.*分支不允许直接push代码，请选择本次')

    // TODO: 确保远端已经有develop
    // 如果远端没有develop分支的话，从主分支拉取远端分支
    const branch = await this.git.branchLocal();
    if (
      branch.current.includes('feature') ||
      branch.current.includes('hotfix')
    ) {
      // TODO: 执行合并提交逻辑
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '请选择本次开发类型',
          default: 'feat',
          choices: [
            {
              name: 'feature',
              value: 'feature',
            },
            {
              name: 'hotfix',
              value: 'hotfix',
            },
          ],
        },
        {
          type: 'input',
          name: 'name',
          message: '请输入分支名称',
        },
      ]);
      this.branch = `${answers.type}/${answers.name}`;
      this.log.info('exec', `生成的开发分支为${this.branch}`);
    }
    await this.checkStash();
    await this.checkConflicted();
    await this.checkoutBranch(this.branch);
    await this.pullRemoteMainAndBranch();
    // if (!(await this.initCommit())) {
    //   await this.pushRemoteRepo(this.branch);
    // }
    // if (this.argv.production) {
    //   await this.addAndPushTag();
    // }
  }

  /**
   * @deprecated
   */
  async addAndPushTag() {
    const tagName = `release/${this.version}`;
    await this.git.addTag(tagName);
    this.log.info('addAndPushTag', `创建Tag版本${tagName}成功`);
    await this.git.mergeFromTo(this.branch, 'main');
    this.log.info('addAndPushTag', `将${this.branch}分支合并到主分支`);
    await this.git.push('origin', tagName);
    this.log.info('addAndPushTag', `向远端推送${tagName}成功`);
  }

  /**
   * @deprecated
   * @returns
   */
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
      return ctu;
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
    return this.version;
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
