import { Package, PackageProps } from '.';
import { log } from '@/utils/log';
import { resolve } from 'path';
import fs from 'fs-extra';

// TODO: local包要判断全称 xxx@x.x.x

export class LocalPackage extends Package {
  constructor(options: PackageProps) {
    super(options);
  }

  async getSourceDir() {
    return this.storageDir;
  }

  async download(targetDir: string) {
    try {
      fs.copySync(resolve(this.storageDir), targetDir);
      log.info('写入模板成功!', '');
    } catch (err) {
      throw new Error(`写入模板失败: ${err}`);
    }
  }
}
