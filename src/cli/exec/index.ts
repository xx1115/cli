import { Package, RemotePackage } from '@/models/package';
import { LocalPackage } from '@/models/package/local';
import { RemoteCommandExec } from './remote';
import { LocalCommandExec } from './local';
import { log } from '@/utils/log';

export interface CommandOptions {
  flags: string;
  description: string;
  defaultValue: string;
}

export interface RemoteCommand {
  command: string;
  commandContent: string;
  description: string;
  packageName: string;
  packageVersion: string;
  options: CommandOptions[];
}

export const execute = function (command: RemoteCommand) {
  return async function (...args: unknown[]) {
    if (!process.env.CLI_HOME_PATH) {
      throw new Error('CLI_HOME_PATH is undefined');
    }
    const params = args.slice(0, args.length - 1);
    let execIns;
    let pkg: Package;
    if (process.env.CLI_LOCAL) {
      pkg = new LocalPackage({
        storageDir: process.env.CLI_LOCAL,
      });
      execIns = new LocalCommandExec(params, log);
      await execIns?.do(pkg);
    } else {
      pkg = new RemotePackage({
        name: command.packageName,
        version: command.packageVersion,
        storageDir: process.env.CLI_HOME_PATH,
      });
      execIns = new RemoteCommandExec(params, log);
      await execIns?.do(pkg);
    }
  };
};
