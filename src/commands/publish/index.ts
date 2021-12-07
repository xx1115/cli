import { log } from '@/utils/log';
import { PublishCommand, PublishCommandParam } from './impl';

export const publishExec = async (...params: [PublishCommandParam, any[]]) => {
  try {
    const [options] = params;
    const command = new PublishCommand(options, log);
    await command.do();
  } catch (e) {
    log.error('publishExec', (e as Error).message);
    console.log(e);
  }
};
