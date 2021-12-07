import { Command } from '@/models';
import { existsSync, readJSONSync } from 'fs-extra';
import { resolve } from 'path';

export interface PublishCommandParam {
  buildCommand: string;
  revert: boolean;
  production: boolean;
}

export class PublishCommand extends Command<PublishCommandParam> {
  protected async prepare() {
    // 1. 确定项目为npm项目
    const dir = process.cwd();
    const pkgPath = resolve(dir, 'package.json');
    this.log.verbose('package.json', pkgPath);
    if (!existsSync(pkgPath)) {
      throw new Error('package.json文件不存在');
    }
    // 2. 确定是否含有name/version/build命令
    const pkg = readJSONSync(pkgPath);
    const { name, version, scripts } = pkg;
    this.log.verbose('package.json', name, version, scripts);
    const buildScriptKey =
      this.argv.buildCommand.replace(/npm\s(run\s)?/, '') || 'build';
    if (!name || !version || !scripts || !scripts[buildScriptKey]) {
      throw new Error(
        `package.json信息不全，请检查是否存在name/version/scripts/scripts(${buildScriptKey})`,
      );
    }
  }

  protected async init() {
    this.log.verbose('publish', 'init', this.argv);
  }

  protected async exec() {
    try {
      const startTime = new Date().getTime();
      // 2. Git Flow自动化
      // 3 云构建和云发布
      const endTime = new Date().getTime();
      this.log.info(
        'exec',
        `本次发布耗时: ${Math.floor((endTime - startTime) / 1000)}秒`,
      );
    } catch (error) {
      this.log.error('exec', (error as Error).message);
    }
  }
}
