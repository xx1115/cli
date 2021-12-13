import { Command } from '@/models';

export interface InitCommandParam {
  resetServer: boolean;
  resetToken: boolean;
  resetOwner: boolean;
  production: boolean;
}

export class InitCommand extends Command<Partial<InitCommandParam>> {
  static isValid() {
    // TODO: 提交时先判断是否有初始化过
    // 调用git的api查看xx.json或者package.json是否存在，如果存在，代表已经初始化过
    // 有可能本地是没有.git文件夹的
    // ssh(public key) https(username, password) api(token)
    // https://github.com/:username/:repo
    // server token username
    // valid
    return true;
  }
}
