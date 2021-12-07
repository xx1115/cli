import { Command } from '@/models';
import { LocalPackage } from '@/models/package/local';

export class LocalCommandExec extends Command<unknown[]> {
  pkg?: LocalPackage;
  async init(pkg: LocalPackage) {
    this.pkg = pkg;
  }

  async exec() {
    this.pkg?.execFile(this.argv);
  }
}
