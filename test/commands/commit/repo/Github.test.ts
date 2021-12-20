import { REPO_OWNER_USER } from '@/commands';
import { GithubServer } from '@/commands/commit/repo/Github';
import { log } from '@/utils/log';

jest.useFakeTimers('legacy');

jest.mock('@/utils/log', () => {
  const verbose = jest.fn().mockImplementation(() => {});
  const info = jest.fn().mockImplementation(() => {});
  const success = jest.fn().mockImplementation(() => {});
  return {
    log: jest.fn().mockImplementation(() => ({ verbose, info, success }))(),
  };
});

describe('测试GithubServer类', () => {
  const token = process.env.TEST_TOKEN || '';
  const owner = 'uuuhdstest';
  const ownerOrg = 'xhhyyds';

  it('初始化', () => {
    new GithubServer(token, log);
    expect(log.verbose).toHaveBeenCalledTimes(1);
  });

  it('getUser', async () => {
    const server = new GithubServer(token, log);
    const user = await server.getUser();
    expect(user.login).toBeDefined();
  });

  it('getOrg', async () => {
    const server = new GithubServer(token, log);
    const user = await server.getOrg();
    expect(user).toBeDefined();
  });

  it('getRepo', async () => {
    const server = new GithubServer(token, log);
    const repo = await server.getRepo('uuuhdstest', 't1');
    expect(repo).toBeDefined();
  });

  it('getRemote', () => {
    const server = new GithubServer(token, log);
    const remoteAddr = server.getRemote('uuuhdstest', 't1');
    expect(remoteAddr).toBe('git@github.com:uuuhdstest/t1.git');
  });

  it(
    'ensureRemoteRepo',
    async () => {
      jest.setTimeout(1000 * 30);
      const server = new GithubServer(token, log);
      const repoName = 't2';
      await server.rmRepo(owner, repoName);
      let repo = await server.getRepo(owner, repoName);
      expect(repo).toBeNull();
      await server.ensureRemoteRepo(owner, repoName, REPO_OWNER_USER);
      repo = await server.getRepo(owner, repoName);
      expect(repo).toBeDefined();
      await server.rmRepo(owner, repoName);
      repo = await server.getRepo(owner, repoName);
      expect(repo).toBeNull();
    },
    30 * 1000,
  );

  it('setToken', () => {
    const git = new GithubServer('', log);
    git.setToken(token);
    expect(token).toBe(git.token);
  });

  it(
    'createOrgRepo',
    async () => {
      jest.setTimeout(1000 * 30);
      const server = new GithubServer(token, log);
      await server.rmRepo(ownerOrg, 't3');
      const repo = await server.createOrgRepo('t3', ownerOrg);
      expect(repo).toBeDefined();
      expect(await server.getRepo(ownerOrg, 't3')).toBeDefined();
      await server.rmRepo(ownerOrg, 't3');
    },
    30 * 1000,
  );

  it('getTokenHelpUrl', () => {
    const server = new GithubServer(token, log);
    expect(server.getTokenHelpUrl()).toEqual(
      'https://docs.github.com/cn/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    );
  });
});
