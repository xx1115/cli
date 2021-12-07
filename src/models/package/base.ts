import { Loggable } from '@/utils';
import { pathExistsSync, readJsonSync } from 'fs-extra';
import { join } from 'path';
import execa from 'execa';

export interface PackageProps {
  storageDir: string;
}

export interface PackageMethods {
  getExecFilePath: () => Promise<string | undefined>;
  getSourceDir: () => Promise<string | void>;
}

export type PackageInterface = PackageMethods & PackageProps;

export class Package extends Loggable implements PackageInterface {
  storageDir: string;
  loadExecFile = false;
  execFilePath = '';
  constructor(options: PackageProps) {
    super();
    const { storageDir } = options;
    this.storageDir = storageDir;
  }

  async getSourceDir() {
    return this.storageDir;
  }

  async getPackageJsonPath(sourceDir: string) {
    const pkgJsonPath = join(sourceDir, 'package.json');
    if (!pathExistsSync(pkgJsonPath)) {
      throw new Error(`can't find package.json file`);
    }
    return pkgJsonPath;
  }

  async getExecFilePath() {
    if (this.loadExecFile) {
      return this.execFilePath;
    }
    let execFilePath = '';
    const sourceDir = await this.getSourceDir();
    const pkgJsonPath = await this.getPackageJsonPath(sourceDir);
    const pkgJson = readJsonSync(pkgJsonPath);
    if (pkgJson.main) {
      execFilePath = join(sourceDir, pkgJson.main);
    } else if (pkgJson.module) {
      execFilePath = join(sourceDir, pkgJson.module);
    } else if (pathExistsSync(join(sourceDir, 'index.js'))) {
      execFilePath = join(sourceDir, 'index.js');
    } else {
      throw new Error(`can't find package exec file`);
    }
    this.loadExecFile = true;
    this.execFilePath = execFilePath;
    return this.execFilePath;
  }

  async execFile(args?: unknown) {
    const execFilePath = await this.getExecFilePath();
    const code = `require('${execFilePath}').call(null,${JSON.stringify(
      args,
    )})`;
    const child = execa('node', ['-e', code], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    child.on('error', (error: unknown) => {
      this.logError('exec error', String(error));
      process.exit(1);
    });
    child.on('exit', (e: number) => {
      this.logVerbose('命令执行成功', String(e));
      process.exit(e);
    });
  }
}
