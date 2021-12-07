import { Command } from '@/models';
import { RemotePackage } from '@/models/package';

export class RemoteCommandExec extends Command<unknown[]> {
  private pkg?: RemotePackage;

  protected async init(pkg: RemotePackage) {
    this.pkg = pkg;
    if (!(await this.pkg.exists())) {
      await this.pkg.download();
      await this.pkg.install();
    }
  }

  protected async exec() {
    this.pkg?.execFile(this.argv);
  }
}
