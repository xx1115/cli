import os from 'os';
import { Command } from '@/models';
import { existsSync, readJson, readJsonSync } from 'fs-extra';
import { Logger } from 'npmlog';
import { basename, join } from 'path';
import { Repo } from './repo';
import { GithubServer } from './repo/git';

export interface RepoConfig {
  token: string;
  ownerType: string;
  belongTo: string;
  server: string;
}

export interface CommitConfig {
  [name: string]: RepoConfig;
}

export enum RepoEnum {
  GITHUB = 'GITHUB',
  GITEE = 'GITEE',
}

export class GitBaseCommand<T> extends Command<T> {
  repoInfo: CommitConfig = {};
  configPath = '';
  cwd: string;
  repoName: string;
  gitServer?: Repo;
  finalConfig: string;
  defaultCfg: string;
  version = '';
  secondCfg: string;
  constructor(props: T, log: Logger) {
    super(props, log);
    this.repoInfo = {};
    this.cwd = process.cwd();
    this.repoName = basename(this.cwd);
    this.defaultCfg = join(this.cwd, 'xx.json');
    this.finalConfig = this.defaultCfg;
    this.secondCfg = join(this.cwd, 'package.json');
    this.configPath = join(os.homedir(), '.xxRepo.json');
  }

  async loadRepoInfo() {
    this.repoInfo = (await readJson(this.configPath)) as CommitConfig;
  }

  getRepoConfig(): RepoConfig {
    return this.repoInfo[this.repoName] ?? {};
  }

  async loadPkgVersion() {
    if (existsSync(this.defaultCfg)) {
      this.version = (await readJsonSync(this.defaultCfg)).version;
    } else if (existsSync(this.secondCfg)) {
      this.version = (await readJsonSync(this.secondCfg)).version;
      this.finalConfig = this.secondCfg;
    } else {
      return true;
    }
  }

  initialGitServer(config: RepoConfig) {
    if (config.server === RepoEnum.GITHUB) {
      this.gitServer = new GithubServer(config.token, this.log);
    } else {
      // TODO: add GiteeServer
      throw new Error(`${config.server}还未实现`);
    }
  }

  baseConfigExists() {
    return existsSync(this.configPath);
  }

  async checkConfigComplete() {
    const config = this.getRepoConfig();
    return config.belongTo && config.server && config.token;
  }
}
