import { join } from 'path';
import execa from 'execa';
import { Package, PackageProps } from '.';
import { manifest, extract } from 'pacote';
import { pathExistsSync } from 'fs-extra';

export enum RemoteType {
  // eslint-disable-next-line no-unused-vars
  NPM_PACKAGE = 0,
}

export interface RemotePackageProps extends PackageProps {
  remoteType?: RemoteType;
  name: string;
  version: string;
}

export class RemotePackage extends Package {
  name: string;
  version: string;
  queryPath: string;
  remoteType: RemoteType = RemoteType.NPM_PACKAGE;
  finalPkgPath = '';
  constructor(options: RemotePackageProps) {
    super(options);
    const { name, version } = options;
    this.name = name;
    this.version = version || 'latest';
    if (options.remoteType) {
      this.remoteType = options.remoteType;
    }
    this.queryPath = `${this.name}@${this.version}`;
  }

  async getFinalPkgPath() {
    if (this.finalPkgPath !== '') return this.finalPkgPath;

    if (this.remoteType === RemoteType.NPM_PACKAGE) {
      const pkgInfo = await this.loadPkgInfo();
      this.finalPkgPath = `${this.name}@${pkgInfo.version}`;
      return this.finalPkgPath;
    }
    return '';
  }

  async getSourceDir() {
    const pkgPath = await this.getFinalPkgPath();
    return join(this.storageDir, pkgPath);
  }

  async install() {
    const sourceDir = await this.getSourceDir();
    execa.sync('npm', ['install'], {
      cwd: sourceDir,
      stdio: 'inherit',
    });
  }

  async exists() {
    const sourceDir = await this.getSourceDir();
    return pathExistsSync(sourceDir);
  }

  loadPkgInfo() {
    return manifest(this.queryPath);
  }

  async download() {
    const pkgFullPath = await this.getFinalPkgPath();
    const sourceDir = await this.getSourceDir();
    await extract(pkgFullPath, sourceDir);
  }
}
