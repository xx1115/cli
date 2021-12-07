import { program } from 'commander';
import { XXCli } from '@/cli/cli';

describe('测试初始化流程', () => {
  let cli: XXCli;
  const pkg = {
    version: '0.0.1',
    bin: {
      xx: 'xxpath',
    },
  };

  beforeAll(async () => {
    cli = new XXCli(program, pkg);
    jest.spyOn(cli, 'logNotice').mockImplementation(() => {});
    await cli.run();
  });

  it('参数不正确时会抛出异常', () => {
    const { program } = cli;
    expect(program).not.toBeUndefined();
    expect(program.description()).toMatch(
      'A scaffolding for an engineered solution',
    );
    program.exitOverride().configureOutput({
      writeErr: () => {},
    });
    expect(() => {
      program.parse(['node', 'test']);
    }).toThrow();
  });

  it('传入-d参数时会debug模式开启', () => {
    const { program } = cli;
    program.command('hello');
    program.parse(['node', 'test', 'hello', '-d']);
    expect(program.opts().debug).toBeTruthy();
  });

  it('传入--debug参数时会debug模式开启', () => {
    const { program } = cli;
    program.command('hello');
    program.parse(['node', 'test', 'hello', '--debug']);
    expect(program.opts().debug).toBeTruthy();
  });

  it('传入-l 参数会开启本地调试模式', () => {
    const { program } = cli;
    program.command('hello');
    program.parse(['node', 'test', 'hello', '-l', '~/xx']);
    expect(program.opts().local).toBe('~/xx');
  });

  it('传入--local 参数会开启本地调试模式', () => {
    const { program } = cli;
    program.command('hello');
    program.parse(['node', 'test', 'hello', '--local', '~/xx']);
    expect(program.opts().local).toBe('~/xx');
  });
});
