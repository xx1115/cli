import { GiteeServer } from '@/commands/commit/repo/Gitee';
import { log } from '@/utils/log';

jest.mock('@/utils/log', () => {
  const verbose = jest.fn().mockImplementation(() => {});
  const info = jest.fn().mockImplementation(() => {});
  const success = jest.fn().mockImplementation(() => {});
  return {
    log: jest.fn().mockImplementation(() => ({ verbose, info, success }))(),
  };
});

describe.only('', () => {
  const token = '';
  const gitServer = new GiteeServer(token, log);
  it('getUser', async () => {
    const user = await gitServer.getUser();
    console.log(user);
    expect(1).toBe(1);
  });
  it('getOrg', async () => {
    const org = await gitServer.getOrg();
    console.log(org);
    expect(1).toBe(1);
  });
});
