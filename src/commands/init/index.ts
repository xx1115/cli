import { Command } from '@/models';
import { log } from '@/utils/log';
import { Logger } from 'npmlog';

interface InitCommandParam {
  force?: boolean;
}

interface CreateCommandParam {
  force?: boolean;
}

export class InitCommand extends Command<InitCommandParam> {
  protected async init() {
    // TODO:
  }

  protected async exec() {
    // TODO:
  }
}

export class CreateCommand extends Command<CreateCommandParam> {
  protected async init() {
    // TODO:
  }

  protected async exec() {
    // TODO:
  }
}

export const initExec = (...params: [InitCommandParam, unknown[]]) => {
  // TODO: add try catch block to catch async exception
  const [options] = params;
  const command = new InitCommand(options, log);
  command.do();
};

export const createExec = (...params: [InitCommandParam, unknown[]]) => {
  // TODO: add try catch block to catch async exception
  const [options] = params;
  const command = new CreateCommand(options, log);
  command.do();
};
