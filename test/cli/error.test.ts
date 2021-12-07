import { XXCli } from '@/cli/cli';
import { program } from 'commander';

const pkg = {
  version: '0.0.1',
  bin: {
    xx: 'xxpath',
  },
};

it('test can load env configuration file normally', async () => {
  const cli = new XXCli(program, pkg);
  jest.spyOn(cli, 'prepare').mockImplementation(() => {
    throw new Error('prepare');
  });
  const logErrorFn = jest.spyOn(cli, 'logError');
  await cli.run();
  expect(logErrorFn).toHaveBeenCalledTimes(1);
});

export {};
