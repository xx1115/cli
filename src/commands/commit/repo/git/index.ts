import { SimpleGit } from 'simple-git';
import { doSpinner } from '@/utils/spinner';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
import { emptyDirSync, ensureDirSync } from 'fs-extra';
import glob from 'glob';
import { Logger } from 'npmlog';
import { join } from 'path';
import { Repo, RepoUserProps } from '..';
import { REPO_OWNER_USER } from '../..';
import { copyFileSync } from 'fs';

export interface GithubServerProps {
  token: string;
}

export class GithubServer implements Repo {
  client: AxiosInstance;
  token: string;
  log: Logger;
  constructor(token: string, log: Logger) {
    this.log = log;
    this.token = token;
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 5000,
    });
    this.client.interceptors.request.use(
      (config: AxiosRequestConfig = { headers: {} }) => {
        const headers = config.headers ?? {};
        headers.Authorization = `token ${this.token}`;
        return config;
      },
      (error) => {
        Promise.reject(error);
      },
    );
    this.client.interceptors.response.use(
      (response) => {
        if (response.status >= 200 && response.status < 300)
          return response.data;
        return null;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  put<T, R>(url: string, data?: T, headers?: AxiosRequestHeaders) {
    return this.client.put<T, R>(url, data, {
      headers,
    });
  }

  async ensureRemoteRepo(
    belongTo: string,
    repoName: string,
    ownerType: string,
  ) {
    let repo = await this.getRepo(belongTo, repoName);
    if (!repo) {
      await doSpinner('开始创建远程仓库...', async () => {
        if (ownerType === REPO_OWNER_USER) {
          repo = await this.createRepo(repoName);
        } else {
          repo = await this.createOrgRepo(repoName, belongTo);
        }
      });
      if (repo) {
        await this.createReadme(belongTo, repoName);
        this.log.verbose('repo', String(repo));
        this.log.success('远程仓库创建成功');
      } else {
        throw new Error('远程仓库创建失败');
      }
    } else {
      this.log.success('远程仓库信息获取成功');
    }
  }

  async cloneToLocal(git: SimpleGit, belongTo: string, repoName: string) {
    return git.clone(this.getRemote(belongTo, repoName) as string, '.');
  }

  moveFiles(from: string, to: string) {
    ensureDirSync(to);
    const files = glob.sync('**', { cwd: from, nodir: true });
    files.forEach((file) => {
      copyFileSync(join(from, file), join(to, file));
    });
    emptyDirSync(from);
  }

  createReadme(belongTo: string, repoName: string) {
    return this.put(
      `/repos/${belongTo}/${repoName}/contents/README.md`,
      {
        owner: belongTo,
        repo: repoName,
        path: 'README.md',
        message: 'doc: add README.md file',
        content: '',
      },
      {
        Accept: 'application/vnd.github.v3+json',
      },
    );
  }

  createRepo(name: string) {
    return this.post(
      '/user/repos',
      { name },
      {
        Accept: 'application/vnd.github.v3+json',
      },
    );
  }

  createOrgRepo(name: string, login: string) {
    return this.post(
      `/orgs/${login}/repos`,
      {
        name,
      },
      {
        Accept: 'application/vnd.github.v3+json',
      },
    );
  }

  getUser() {
    return this.get<undefined, RepoUserProps>('/user');
  }

  getOrg() {
    return this.get<undefined, RepoUserProps[]>('/user/orgs');
  }

  getRepo(login: string, name: string) {
    return this.get(`/repos/${login}/${name}`).catch((_err) => {
      // this.log.logVerbose('', _err);
      this.log.info('getRepo', `${login}/${name}仓库不存在`);
      return null;
    });
  }

  getRemote(belongTo: string, repo: string) {
    return `git@github.com:${belongTo}/${repo}.git`;
  }

  getTokenHelpUrl() {
    return 'https://docs.github.com/cn/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token';
  }

  get<T, R>(url: string, headers?: AxiosRequestHeaders, params?: T) {
    return this.client.get<T, R>(url, {
      headers,
      params,
    });
  }

  post<T, R>(url: string, data?: T, headers?: AxiosRequestHeaders) {
    return this.client.post<T, R>(url, data, {
      headers,
    });
  }
}
