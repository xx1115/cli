import { Command } from '@/models';
import { Logger } from 'npmlog';
import { resolve } from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import axios from 'axios'

interface TemplateConfig {
  answers?: any;
  ignore?: (string | any[]);
}

interface ArgvOption {
  projectName: string;
  force: boolean;
  templateDir: string;
  templateName: string;
  offline: boolean;
}

export class CreateOrInitCommand extends Command<ArgvOption> {
  targrtDir: string = '';
  isDirEmpty: boolean = true;
  baseConfigList: any[];
  templateConfig: TemplateConfig = {};

  constructor(argv: ArgvOption, log: Logger) {
    super(argv, log);
    this.baseConfigList = [{
      type: 'input',
      message: '为项目取个名字:',
      name: 'name',
      default: this.argv.projectName
    },{
        type: 'input',
        message: '为项目指定一个版本:',
        name: 'version',
        default: "0.0.1",
        // TODO: 校验版本号更严谨的方法
        validate: function(val: string) {
          return val.split('.').findIndex(num => !(/[0-9]/.test(num)))
        }
    }];

  }

  async checkDir (projectName: string) {
    this.targrtDir = resolve(process.cwd(), projectName)
    const isDirEmpty = fs.existsSync(this.targrtDir);
    let answers = await inquirer.prompt([{
      type: 'list',
      message: `Target directory ${this.argv.projectName} already exists. Pick an action: (Use arrow keys)`,
      name: 'cleanDir',
      choices: [
        'Overwrite',
        'Merge',
        'Cancel',
      ],
      when: () => {
        return isDirEmpty
      }
    }])
    switch(answers.cleanDir){
      case 'Overwrite':
        fs.removeSync(this.targrtDir)
        break;
      case 'Cancel':
        throw new Error('stop!');
    }
  }

  async mergeQuestionList (data: TemplateConfig) {
    this.templateConfig = data
    if (!data.answers) return
    let configList = data.answers
    this.baseConfigList = this.baseConfigList.map(baseConfig => {
      return configList.find((item: { name: any; }) => item.name === baseConfig.name) || baseConfig
    })
  }

  async inquirerUser () {
    return inquirer.prompt(this.baseConfigList)
  }

  async serchNpmPackages () {
    let res = await axios.get('https://api.npms.io/v2/search/suggestions', { params: { q: '@xx1115' } })
    let data = res?.data
    return data
  }

  async selectTemplateInNpm (packageList: any[]) {
    return (await inquirer.prompt([{
      type: 'list',
      message: `please choose a template`,
      name: 'packageName',
      choices: packageList.map((pkg: { package: { name: any; }; }) => pkg.package.name),
      when: () => {
        return packageList.length
      }
    }])).packageName
  }

  parsePkgNameAndVersion (packageName: string) {
    let version;
    let name;
    let opt = packageName.trim().split('@')
    let len = opt.length
    if (len > 1 && /[0-9]/.test(opt[len - 1][0])) {
      version = opt.pop()
      name = opt.join('@')
    } else {
      name = packageName;
      version = 'latest'
    }
    return { name, version }
  }

}