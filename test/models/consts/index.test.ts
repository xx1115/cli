import { CLI_DEFAULT_HOME, CLI_ENV_FILE_NAME } from '@/models';

it('test constants', () => {
  expect(CLI_DEFAULT_HOME).toEqual('.xx_cli');
  expect(CLI_ENV_FILE_NAME).toEqual('.xx_env');
});
