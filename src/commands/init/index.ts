import { CreateOrInitCommand } from './CreateOrInitCommand';
import { LocalPackage, Package, RemotePackage } from '@/models/package';
import { resolve } from 'path';
import { log } from '@/utils/log';
import { Logger } from 'npmlog';
import { env } from 'process';

interface CreateCommandParam {
  force: boolean;
  Tp: string;
  offline: boolean;
}

interface ArgvOption {
  projectName: string;
  force: boolean;
  templateDir: string;
  templateName: string;
  offline: boolean;
}

export class CreateCommand extends CreateOrInitCommand {
  options: Partial<ArgvOption> | undefined;

  constructor(argv: ArgvOption, log: Logger) {
    super(argv, log);
  }

  protected async init() {
    this.log.info('argvObject', `${this.argv}`);
    if (!process.env.CLI_HOME_PATH) {
      throw new Error('CLI_HOME_PATH is undefined');
    }
    let { projectName, templateName, templateDir, offline } = this.argv;
    let pkg;
    await this.checkDir(projectName);
    if (templateDir) {
      pkg = new LocalPackage({
        storageDir: templateDir,
      });
    } else if (templateName && offline) {
      pkg = new LocalPackage({
        storageDir: resolve(process.env.CLI_HOME_PATH, templateName)
      });
    } else {
      let packageOption;
      if (!templateName) {
        let packageList = await this.serchNpmPackages()
        let packageName = await this.selectTemplateInNpm(packageList)
        packageOption = packageList.filter((pkg: { package: { name: any; }; }) => pkg.package.name === packageName)?.[0]?.package
      } else {
        packageOption = this.parsePkgNameAndVersion(templateName)
      }
      let { name, version } = packageOption
      pkg = new RemotePackage({
        name,
        version,
        storageDir: process.env.CLI_HOME_PATH,
      });
      pkg.download()
    }
    let packageConfigOption = await pkg.loadConfig();
    await this.mergeQuestionList(packageConfigOption)
    let answers = await this.inquirerUser();
    let targetDir = resolve(process.cwd(), projectName);
    await pkg.copy(targetDir);
    await pkg.renderEjs(targetDir, answers, this.templateConfig.ignore);
  }
  protected async exec() {}
}

export const createExec = (...params: [string, string, CreateCommandParam]) => {
  try {
    const [projectName, templateName, { force, Tp, offline }] = params;
    const options = { projectName, templateName, force, templateDir: Tp, offline };
    const command = new CreateCommand(options, log);
    command.do(options);
  } catch (err) {
    log.info('initError', `${err}`);
  }
};
