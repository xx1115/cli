import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { Logger } from 'npmlog';
import { Git, RepoUserProps } from '.';

export interface GiteeServerProps {
  token: string;
}

export class GiteeServer extends Git {
  client: AxiosInstance;
  constructor(token: string, log: Logger) {
    super(token, log);
    this.client = axios.create({
      baseURL: 'https://gitee.com/api/v5',
      timeout: 5000,
    });
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
    log.verbose('GiteeServer', '初始化完成');
  }

  async rmRepo(owner: string, repo: string) {
    return this.delete(`/repos/${owner}/${repo}`, {
      access_token: this.token,
      owner,
      repo,
    });
  }

  createReadme(owner: string, repo: string) {
    // return this.post(`/repos/${owner}/${repo}/contents/README.md`, {
    //   access_token: this.token,
    //   owner,
    //   repo,
    //   path: 'README.md',
    //   message: 'doc: add README.md file',
    //   content: 'IA==',
    // });
    return Promise.resolve();
  }

  createRepo(name: string) {
    return this.post('/user/repos', { name, access_token: this.token });
  }

  createOrgRepo(name: string, org: string) {
    return this.post(`/orgs/${org}/repos`, {
      name,
      access_token: this.token,
    });
  }

  getUser() {
    return this.get<undefined, RepoUserProps>(
      `/user?access_token=${this.token}`,
    );
  }

  getOrg() {
    return this.get<undefined, RepoUserProps[]>(
      `/user/orgs?access_token=${this.token}`,
    );
  }

  getRepo(login: string, name: string) {
    return this.get(`/repos/${login}/${name}`).catch((_err) => {
      this.log.verbose('', _err);
      this.log.info('getRepo', `${login}/${name}仓库不存在`);
      return null;
    });
  }

  getRemote(owner: string, repo: string) {
    return `git@gitee.com:${owner}/${repo}.git`;
  }

  getTokenHelpUrl() {
    return 'https://gitee.com/profile/personal_access_tokens';
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

  delete<T, R>(url: string, headers?: AxiosRequestHeaders) {
    return this.client.delete<T, R>(url, {
      headers,
    });
  }
}
