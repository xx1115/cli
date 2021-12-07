import { XXCli, init } from '@/cli/cli';
import { program } from 'commander';
import os from 'os';
import fse, { pathExistsSync } from 'fs-extra';
import { resolve } from 'path';
import { CLI_DEFAULT_HOME, CLI_ENV_FILE_NAME } from '@/models';

const pkg = {
  version: '0.0.1',
  bin: {
    xx: 'xxpath',
  },
};

it('test can load env configuration file normally', async () => {
  const userHome = os.tmpdir();
  const envPath = resolve(userHome, CLI_ENV_FILE_NAME);
  fse.writeFileSync(envPath, 'KEY=VALUE');
  const cli = new XXCli(program, pkg, { userHome });
  jest.spyOn(cli, 'logNotice').mockImplementation(() => {});
  await cli.run();
  expect(process.env.KEY).toBe('VALUE');
  fse.rmSync(envPath);
  expect(pathExistsSync(envPath)).toBeFalsy();
});

it('test when env configuration file is not exist, cli will create it', async () => {
  const userHome = os.tmpdir();
  const envPath = resolve(userHome, CLI_ENV_FILE_NAME);
  expect(pathExistsSync(envPath)).toBeFalsy();
  const cli = new XXCli(program, pkg, { userHome });
  jest.spyOn(cli, 'logNotice').mockImplementation(() => {});
  await cli.run();
  expect(pathExistsSync(envPath)).toBeTruthy();
  expect(process.env.KEY).toBe('VALUE');
  fse.rmSync(envPath);
  expect(pathExistsSync(envPath)).toBeFalsy();
});

it(`when the environment variable CLI_HOME exists, the CLI_HOME_PATH is homePath/${CLI_DEFAULT_HOME}`, async () => {
  const userHome = os.tmpdir();
  const cacheDir = resolve(userHome, CLI_DEFAULT_HOME);
  const cli = new XXCli(program, pkg, { userHome });
  jest.spyOn(cli, 'logNotice').mockImplementation(() => {});
  await cli.run();
  expect(process.env.CLI_HOME_PATH).toBe(cacheDir);
});

it('when the environment variable CLI_HOME exists, the CLI_HOME_PATH is homePath/.xx-cli-test', async () => {
  process.env.CLI_HOME = '.xx-cli-test';
  const userHome = os.tmpdir();
  const cacheDir = resolve(userHome, process.env.CLI_HOME);
  const cli = new XXCli(program, pkg, { userHome });
  jest.spyOn(cli, 'logNotice').mockImplementation(() => {});
  await cli.run();
  expect(process.env.CLI_HOME_PATH).toBe(cacheDir);
});

it('test initialization', async () => {
  const cli = await init(program, pkg);
  expect(cli instanceof XXCli).toBeTruthy();
});
