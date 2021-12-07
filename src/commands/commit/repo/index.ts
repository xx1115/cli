import { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { SimpleGit } from 'simple-git';

export interface RepoUserProps {
  login: string;
}

export interface Repo {
  // git openapi 使用的凭证
  token: string;

  // 发起http请求的客户端
  client: AxiosInstance;

  // 获取使用token的帮助文档
  getTokenHelpUrl: () => string;

  // 创建一个用户仓库
  createRepo: (login: string) => Promise<unknown>;

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

  // 将远端的git项目clone到本地
  cloneToLocal: (git: SimpleGit, belongTo: string, repoName: string) => void;

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
