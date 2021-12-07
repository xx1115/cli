/* eslint-disable @typescript-eslint/no-empty-function */
import { Command } from '@/models';
import { log } from '@/utils';
class InitCommand extends Command<string> {}

class InitCommandInit extends Command<string> {
  async init() {}
}

class InitImpl extends Command<string> {
  async init() {}
  async exec() {}
}

describe('test Command Initialize', () => {
  it("when init method didn't be implemented, throw error", async () => {
    const init = new InitCommand('', log);
    await init.do().catch((e) => {
      expect(e instanceof Error).toBeTruthy();
    });
  });

  it("when exec method didn't be implemented, throw error", async () => {
    const init = new InitCommandInit('', log);
    await init.do().catch((e) => {
      expect(e instanceof Error).toBeTruthy();
    });
  });

  it('when node version check failed, throw error', async () => {
    const init = new InitImpl('', log);
    jest.spyOn(init, 'checkNodeVersion').mockImplementation(() => {
      throw new Error('node version not matched');
    });
    expect(init.checkNodeVersion).toThrowError();
    await init.do().catch((e) => {
      expect(e instanceof Error).toBeTruthy();
    });
  });

  it('when node version check success, run normally', async () => {
    const init = new InitImpl('', log);
    jest.spyOn(init, 'checkExecEnv').mockImplementation(() => true);
    const initFun = jest.spyOn(init, 'init');
    const execFun = jest.spyOn(init, 'exec');
    await init.do().then(() => {
      expect(initFun).toBeCalledTimes(1);
      expect(execFun).toBeCalledTimes(1);
    });
  });

  it('when node version less then develop version, it will throw an error', () => {
    const init = new InitImpl('', log);
    jest.spyOn(init, 'checkNodeVersion').mockImplementation(() => false);
    expect(init.checkExecEnv).toThrow();
    const catchFn = jest.fn();
    try {
      init.checkExecEnv();
    } catch (e) {
      catchFn();
    }
    expect(catchFn).toHaveBeenCalled();
  });

  it('when node version gather then develop version, it will return true', () => {
    const init = new InitImpl('', log);
    expect(init.checkNodeVersion()).toBeTruthy();
  });
});
