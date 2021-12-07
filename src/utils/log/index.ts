import log from 'npmlog';
import { events } from '../events';

log.level = 'info';

log.heading = 'xx'; // 修改前缀
log.addLevel('success', 2000, { fg: 'green', bold: true }); // 添加自定义命令

events.on('LOG_LEVEL_CHANGE', (level = 'verbose') => {
  log.level = level;
  log.verbose('npm log level change, now is ', level);
});

export { log };

/**
 * TODO: TBD
 * @deprecated
 */
export class Loggable {
  logNotice(prefix: string, message = '', ...args: unknown[]) {
    this.log('notice', prefix, message, ...args);
  }

  logError(prefix: string, message = '', ...args: unknown[]) {
    this.log('error', prefix, message, ...args);
  }

  logVerbose(prefix: string, message = '', ...args: unknown[]) {
    this.log('verbose', prefix, message, ...args);
  }

  private log(
    level: string,
    prefix: string,
    message: string,
    ...args: unknown[]
  ) {
    log[level](prefix, message, ...args);
  }

  logSuccess(prefix: string, message = '', ...args: unknown[]) {
    this.log('success', prefix, message, ...args);
  }

  logInfo(prefix: string, message = '', ...args: unknown[]) {
    this.log('info', prefix, message, ...args);
  }
}
