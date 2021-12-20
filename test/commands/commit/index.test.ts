import {
  ensureDirSync,
  pathExistsSync,
  writeJsonSync,
  readJSONSync,
} from 'fs-extra';
import { rmSync } from 'fs';
import os from 'os';
import { join } from 'path';
import { CommitCommand } from '@/commands';
import { log } from '@/utils/log';

let tmpPath: string;

beforeAll(() => {
  tmpPath = join(os.homedir(), '.tmp');
  ensureDirSync(tmpPath);
});

afterAll(() => {
  rmSync(tmpPath, { force: true, recursive: true });
});

jest.mock('@/utils/log', () => {
  const verbose = jest.fn().mockImplementation(() => {});
  const info = jest.fn().mockImplementation(() => {});
  const success = jest.fn().mockImplementation(() => {});
  const notice = jest.fn().mockImplementation(() => {});
  return {
    log: jest
      .fn()
      .mockImplementation(() => ({ verbose, info, success, notice }))(),
  };
});

describe.only('ensurePkgVersion', () => {
  it('ensurePkgVersion no config', async () => {
    const ensurePkgVersionPath = join(tmpPath, 'ensurePkgVersion0');
    ensureDirSync(ensurePkgVersionPath);
    process.chdir(ensurePkgVersionPath);
    const cmd = new CommitCommand({}, log);
    await cmd.ensurePkgVersion();
    const configPath = join(ensurePkgVersionPath, 'xx.json');
    expect(pathExistsSync(configPath)).toBeTruthy();
    expect(readJSONSync(configPath).version).toBe('0.0.1');
    expect(cmd.version).toBe('0.0.1');
  });

  it('ensurePkgVersion xx.json', async () => {
    const ensurePkgVersionPath = join(tmpPath, 'ensurePkgVersion1');
    ensureDirSync(ensurePkgVersionPath);
    process.chdir(ensurePkgVersionPath);
    writeJsonSync(join(ensurePkgVersionPath, 'xx.json'), {
      version: '1.0.0',
    });
    const cmd = new CommitCommand({}, log);
    await cmd.ensurePkgVersion();
    expect(cmd.version).toBe('1.0.0');
  });

  it('ensurePkgVersion package.json', async () => {
    const ensurePkgVersionPath = join(tmpPath, 'ensurePkgVersion2');
    ensureDirSync(ensurePkgVersionPath);
    writeJsonSync(join(ensurePkgVersionPath, 'package.json'), {
      version: '1.0.0',
    });
    process.chdir(ensurePkgVersionPath);
    const cmd = new CommitCommand({}, log);
    await cmd.ensurePkgVersion();
    expect(cmd.version).toBe('1.0.0');
  });

  it('ensurePkgVersion xx.json and package.json', async () => {
    const ensurePkgVersionPath = join(tmpPath, 'ensurePkgVersion3');
    ensureDirSync(ensurePkgVersionPath);
    process.chdir(ensurePkgVersionPath);
    writeJsonSync(join(ensurePkgVersionPath, 'package.json'), {
      version: '0.0.1',
    });
    writeJsonSync(join(ensurePkgVersionPath, 'xx.json'), {
      version: '0.0.2',
    });
    const cmd = new CommitCommand({}, log);
    await cmd.ensurePkgVersion();
    expect(cmd.version).toBe('0.0.2');
  });
});

describe('test commit command', () => {
  it('configRepo', () => {});
  it('getUserAndOrg', () => {});
  it('configServer', () => {});
  it('configToken', () => {});
  it('configOwner', () => {});
  it('needSetConfig', () => {});
  it('checkConfigComplete', () => {});
  it('getRepoConfig', () => {});
  it('getRepoConfigByKey', () => {});
  it('updateRepoConfig', () => {});
  it('ensureRepoConfig', () => {});
  it('loadRepoInfo', () => {});

  it('addCommitJson', () => {});
  it('pushMainRemote', () => {});
  it('checkRemoteMain', () => {});
  it('initCommit', () => {});
  it('checkConflicted', () => {});
  it('checkStash', () => {});
  it('whetherContinue', () => {});

  it('pushRemoteRepo', () => {});
  it('pullRemoteMainAndBranch', () => {});
  it('pullRemoteRepo', () => {});
  it('checkoutBranch', () => {});
  it('getCorrectVersion', () => {});
  it('syncVersionToPackageJson', () => {});
  it('getRemoteBranchList', () => {});
});

describe('场景测试', () => {
  it('本地未与远端创建关联，本地是空目录，远端是已创建仓库，进行关联，关联后可以进行提交', () => {});
  it('本地未与远端创建关联，本地为非空目录，远端是已创建仓库，进行关联，关联后可以进行提交', () => {});
  it('本地未与远端创建关联，远端并无仓库，会同步创建仓库并创建关联，此时会将当前目录下所有内容提交到主分支当做第一次release版本', () => {});
});
