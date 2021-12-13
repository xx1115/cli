import { homedir } from 'os';
import { env } from 'process';
import { resolve, join } from 'path';
import { writeFileSync } from 'fs';
import { Command } from 'commander';
import rootCheck from 'root-check';
import pathExists from 'path-exists';
import { events, Loggable } from '@/utils';
import { CLI_DEFAULT_HOME, CLI_ENV_FILE_NAME } from '@/models';
import { createExec, publishExec } from '@/commands';
import dotEnv from 'dotenv';
import { RemoteCommand, execute } from './exec';
import { commitExec } from '@/commands/commit';

export interface PkgInterface {
  version: string;
  bin: { [key: string]: string };
}

export interface CLIOptions {
  userHome?: string;
}

export class XXCli extends Loggable {
  readonly program: Command;
  readonly userHome: string;
  readonly pkg: PkgInterface;

  constructor(program: Command, pkg: PkgInterface, options: CLIOptions = {}) {
    super();
    this.program = program;
    this.userHome = options.userHome || homedir();
    this.pkg = pkg;
  }

  rootDowngrading() {
    rootCheck();
  }

  async checkGlobalUpdate() {
    // TODO:
  }

  async registerCommand() {
    this.registerLocal();
    await this.registerRemote();
  }

  registerLocal() {
    const { program, pkg } = this;
    program
      .name(Object.keys(pkg.bin)[0])
      .usage('<command> [options]')
      .option('-d, --debug', 'Whether to enable debugging mode', false)
      .option('-l, --local <local>', 'Specify the local debug file path', '')
      .description('A scaffolding for an engineered solution')
      .version(pkg.version);

    program
      .command('init <project-name>')
      .option('-f, --force', 'Whether to force initialization', false)
      // .option('-t <template-name>, --template', 'Remote Template Name')
      // .option('-tp <template-dir>, --template-position', 'Local Template Name')
      .description('Initialize a project')
      // .action(initExec);

    program
      .command('create <project-name> [template-name]')
      .option('-f, --force', 'Whether to force initialization', false)
      .option('-tp <temopate-dir>, --template-position <temopate-dir>', 'Local Template Name')
      .option('--offline', 'Template In The Local Cache', false)
      .description('Create a project')
      .action(createExec);

    program
      .command('commit')
      .option('-rs, --resetServer', 'reset git server', false)
      .option('-rt, --resetToken', 'reset git token', false)
      .option('-rO, --resetOwner', 'reset owner info', false)
      .option('-p, --production', 'add release and publish', false)
      .description('handle git flow')
      .action(commitExec);

    program
      .command('publish')
      .option('-r, --revert', 'rollback version', false)
      .option('-p, --production', 'publish production environment', false)
      .option('--buildCommand', 'The build command for this project')
      .description('publish project')
      .action(publishExec);

    // listening to options, if debug is true, change the log level
    program.on('option:debug', function () {
      if (program.opts().debug) {
        events.emit('LOG_LEVEL_CHANGE', 'verbose');
      }
    });

    program.on('option:local', function () {
      env.CLI_LOCAL = program.opts().local;
    });
  }

  async registerRemote() {
    const { program } = this;
    const SETTINGS: { [name: string]: string } = {};
    const commands: RemoteCommand[] = [
      {
        command: 'kill',
        commandContent: 'kill <port>',
        description: 'Kills the port number of the corresponding process',
        packageName: '@xhh-cli-dev/kill',
        packageVersion: 'latest',
        options: [],
      },
    ];

    commands.forEach((command) => {
      SETTINGS[command.command] = command.packageName;
    });

    commands.forEach((command) => {
      const { commandContent, options = [], description } = command;
      const subCommnad = program.command(commandContent);
      description && subCommnad.description(description);
      options.forEach((option) => {
        subCommnad.option(
          option.flags,
          option.description,
          option.defaultValue,
        );
      });
      subCommnad.action(execute(command));
    });
  }

  envFileExists(dotenvPath: string) {
    return pathExists.sync(dotenvPath);
  }

  loadEnv() {
    const dotenvPath = resolve(this.userHome, CLI_ENV_FILE_NAME);
    if (this.envFileExists(dotenvPath)) {
      // load env to process.env
      dotEnv.config({ path: dotenvPath });
    } else {
      // create demo file
      writeFileSync(dotenvPath, 'CLI_DEFAULT_HOME=.xx-cli');
    }
    this.createDefaultConfig();
    events.emit('CLI_BASEURL_CHANGE', env.XHH_CLI_BASE_URL);
    this.logVerbose('env config', JSON.stringify(env));
  }

  createDefaultConfig() {
    if (env.CLI_HOME) {
      env.CLI_HOME_PATH = join(this.userHome, env.CLI_HOME);
    } else {
      env.CLI_HOME_PATH = join(this.userHome, CLI_DEFAULT_HOME);
    }
  }

  async prepare() {
    this.rootDowngrading();
    this.loadEnv();
  }

  async run() {
    try {
      await this.prepare();
      await this.registerCommand();
      await this.checkGlobalUpdate();
    } catch (e) {
      this.logError('xx cli run throw error', String(e));
      process.env.CONSOLE_ERROR && console.log(e);
    }
  }
}

export interface XXCliInit {
  (program: Command, pkg: PkgInterface): Promise<XXCli>;
}

export const init: XXCliInit = async (program: Command, pkg: PkgInterface) => {
  const cli = new XXCli(program, pkg);
  await cli.run();
  return cli;
};
