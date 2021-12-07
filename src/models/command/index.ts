import { checkVersion, DEV_NODE_VERSION } from '@/utils/version';
import { Logger } from 'npmlog';

export class Command<T> {
  argv: T;
  options: Partial<T> | undefined;
  log: Logger;
  constructor(argv: T, log: Logger) {
    this.log = log;
    this.argv = argv;
    this.log.verbose('argv', JSON.stringify(this.argv));
  }

  checkNodeVersion() {
    return checkVersion();
  }

  checkExecEnv() {
    if (!this.checkNodeVersion()) {
      throw new Error(
        `the node version you used must be gather then ${DEV_NODE_VERSION}`,
      );
    }
  }

  protected async prepare(options?: unknown) {
    // TODO:
  }

  protected async init(options?: unknown) {
    throw new Error('init method must be implemented by sub class');
  }

  protected async exec(options?: unknown) {
    throw new Error('exec method must be implemented by sub class');
  }

  async do(options?: unknown): Promise<boolean | undefined> {
    this.checkExecEnv();
    await this.prepare(options);
    await this.init(options);
    await this.exec(options);
    return true;
  }
}
