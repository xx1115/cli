import simpleGit, { SimpleGit } from 'simple-git';
import { doSpinner } from '@/utils/spinner';
import { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { emptyDirSync, ensureDirSync } from 'fs-extra';
import glob from 'glob';
import { Logger } from 'npmlog';
import { join } from 'path';
import { REPO_OWNER_USER } from '..';
import { copyFileSync, statSync } from 'fs';

export interface RepoUserProps {
  login: string;
}

export interface Repo {
  // git openapi 使用的凭证
  token: string;

  // 发起http请求的客户端
  // client: AxiosInstance;

  // 获取使用token的帮助文档
  getTokenHelpUrl: () => string;

  // 创建一个用户仓库
  createRepo: (login: string) => Promise<unknown | never>;

  // 创建故意而组织仓库
  createOrgRepo: (name: string, login: string) => Promise<unknown>;

  // 获取仓库信息
  getRepo: (login: string, name: string) => Promise<unknown>;

  // 获取用户信息
  getUser: () => Promise<RepoUserProps>;

  // 用户组织信息
  getOrg: () => Promise<RepoUserProps[]>;

  // 创建一个readme文件
  createReadme: (belongTo: string, repoName: string) => Promise<unknown>;

  // 获取远程git地址
  getRemote: (login: string, name: string) => string;

  // 移动文件
  moveFiles: (from: string, to: string) => void;

  // 删除远程仓库
  rmRepo: (belongTo: string, repoName: string) => void;

  // 将远端的git项目clone到本地
  cloneToLocal: (
    pwd: string,
    belongTo: string,
    repoName: string,
  ) => Promise<unknown>;

  // 设置token信息
  setToken: (token: string) => void;

  // 确保有该远程仓库，在没有时，会自动创建
  ensureRemoteRepo: (
    belongTo: string,
    repoName: string,
    ownerType: string,
  ) => void;

  // http client 包装函数
  get: <T, R>(
    url: string,
    headers: AxiosRequestHeaders,
    params?: T,
  ) => Promise<R>;

  // http client post 包装函数
  post: <T, R>(
    url: string,
    data?: T,
    headers?: AxiosRequestHeaders,
  ) => Promise<R>;
}

export abstract class Git implements Repo {
  token: string;
  log: Logger;
  constructor(token: string, log: Logger) {
    this.log = log;
    this.token = token;
  }

  abstract getTokenHelpUrl(): string;
  abstract createRepo(login: string): Promise<unknown>;
  abstract createOrgRepo(name: string, login: string): Promise<unknown>;
  abstract getRepo(login: string, name: string): Promise<unknown>;
  abstract getUser(): Promise<RepoUserProps>;
  abstract getOrg(): Promise<RepoUserProps[]>;
  abstract createReadme(belongTo: string, repoName: string): Promise<unknown>;
  abstract getRemote(login: string, name: string): string;
  abstract rmRepo(belongTo: string, repoName: string): void;

  abstract get<T, R>(
    url: string,
    headers: AxiosRequestHeaders,
    params?: T | undefined,
  ): Promise<R>;

  abstract post<T, R>(
    url: string,
    data?: T | undefined,
    headers?: AxiosRequestHeaders | undefined,
  ): Promise<R>;

  setToken(token: string) {
    this.token = token;
  }

  async ensureRemoteRepo(owner: string, repoName: string, ownerType: string) {
    let repo = await this.getRepo(owner, repoName);
    if (!repo) {
      await doSpinner('开始创建远程仓库...', async () => {
        if (ownerType === REPO_OWNER_USER) {
          repo = await this.createRepo(repoName);
        } else {
          repo = await this.createOrgRepo(repoName, owner);
        }
      });
      if (repo) {
        // await this.createReadme(owner, repoName);
        this.log.verbose('repo', String(repo));
        this.log.success('远程仓库创建成功');
      } else {
        throw new Error('远程仓库创建失败');
      }
    } else {
      this.log.success('远程仓库信息获取成功');
    }
  }

  async cloneToLocal(tmpDir: string, owner: string, repoName: string) {
    const git: SimpleGit = simpleGit(tmpDir);
    return git.clone(this.getRemote(owner, repoName) as string, tmpDir);
  }

  moveFiles(from: string, to: string) {
    ensureDirSync(to);
    const files = glob.sync('**', {
      cwd: from,
      dot: true,
      // nodir: true,
      ignore: ['**/node_modules/**', '.git/**'],
    });
    files
      .filter((file) => {
        return statSync(join(from, file)).isDirectory();
      })
      .forEach((file) => {
        const p = join(to, file);
        ensureDirSync(p);
      });
    files
      .filter((file) => {
        return statSync(join(from, file)).isFile();
      })
      .forEach((file) => {
        copyFileSync(join(from, file), join(to, file));
      });
    emptyDirSync(from);
  }
}
