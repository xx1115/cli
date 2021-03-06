import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
import { Logger } from 'npmlog';
import { Git, RepoUserProps } from './Git';

export class GithubServer extends Git {
  private client: AxiosInstance;

  constructor(token: string, log: Logger) {
    super(token, log);
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

  createReadme(owner: string, repoName: string) {
    return this.put(
      `/repos/${owner}/${repoName}/contents/README.md`,
      {
        owner: owner,
        repo: repoName,
        path: 'README.md',
        message: 'doc: add README.md file',
        content: 'IA==',
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
    return `git@github.com:${owner}/${repo}.git`;
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
