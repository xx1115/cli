import { program } from 'commander';
import pkg from '../../package.json';
import { init } from './cli';

async function doL() {
  const cli = await init(program, pkg);
  cli.program.parse(process.argv);
}

doL();
