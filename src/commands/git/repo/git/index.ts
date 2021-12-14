import simpleGit, { SimpleGit } from 'simple-git';
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
import { copyFileSync, statSync } from 'fs';
import { REPO_OWNER_USER } from '../../init';

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
    log.verbose('GithubServer', '初始化完成');
  }

  async rmRepo(owner: string, repo: string) {
    if (await this.getRepo(owner, repo)) {
      await this.delete(`/repos/${owner}/${repo}`);
    }
  }

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
        await this.createReadme(owner, repoName);
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

  createReadme(owner: string, repoName: string) {
    return this.put(
      `/repos/${owner}/${repoName}/contents/README.md`,
      {
        owner: owner,
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

  createOrgRepo(name: string, owner: string) {
    return this.post(
      `/orgs/${owner}/repos`,
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
    return this.get(`/repos/${login}/${name}`, {
      Accept: 'application/vnd.github.v3+json',
    }).catch((_err) => {
      this.log.verbose('', _err);
      this.log.info('getRepo', `${login}/${name}仓库不存在`);
      return null;
    });
  }

  getRemote(owner: string, repo: string) {
    return `https://github.com/${owner}/${repo}.git`;
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

  put<T, R>(url: string, data?: T, headers?: AxiosRequestHeaders) {
    return this.client.put<T, R>(url, data, {
      headers,
    });
  }

  delete<T, R>(url: string, headers?: AxiosRequestHeaders) {
    return this.client.delete<T, R>(url, {
      headers,
    });
  }
}
