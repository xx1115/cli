import { CommitCommand, CommitCommandParam } from './commit';
import { InitCommand } from './init';
import { log } from '@/utils/log';

export const commitExec = async (...params: [CommitCommandParam, any[]]) => {
  try {
    const [options] = params;
    const command = new CommitCommand(options, log);
    await command.do();
  } catch (e) {
    log.error('commitExec', (e as Error).message);
    process.env.CONSOLE_ERROR && console.log(e);
  }
};

export const gitInitExec = async (...params: [CommitCommandParam, any[]]) => {
  try {
    const [options] = params;
    const command = new InitCommand(options, log);
    await command.do();
  } catch (e) {
    log.error('gitInitExec', (e as Error).message);
    process.env.CONSOLE_ERROR && console.log(e);
  }
};
