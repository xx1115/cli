import execa from 'execa';
import terminalLink from 'terminal-link';
import chalk from 'chalk';

try {
  execa.sync('code', ['-v']);
} catch (e) {
  console.log(
    terminalLink(
      chalk.red(
        '为了统一IDE开发，请统一使用vscode，并安装code命令，请点击参考文档进行配置',
      ),
      'https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line',
    ),
  );
}
