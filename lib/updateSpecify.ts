import chalk from 'chalk';
import {
  ProjectConfigType,
} from './types';
import {
  getPackagesConfig,
  getMultiSelectPrompt,
} from './utils';
import * as updateSpecifyUtils from './updateSpecify';

const shell = require('shelljs');
const { Form, Select } = require('enquirer');

export function getUpdatePackagePrompt(opts?: any) {
  return {
    formPrompt: new Form({
      ...opts,
      type: 'form',
      name: 'update',
      message: '输入需要更新的依赖(用逗号分割，例如：vue@2.6.12,vue-router,vuex@latest):',
      choices: [
        { name: 'dependencies', message: 'dependencies 依赖' },
        { name: 'devDependencies', message: 'devDependencies 依赖' },
      ],
    }),
    selectPrompt: new Select({
      ...opts,
      type: 'select',
      name: 'install',
      message: '是否安装依赖到 node_module:',
      choices: ['是', '否'],
    }),
  };
}

export async function getUpdatePackageTxt(): Promise<
{
  update: { dependencies: string; devDependencies: string; };
  install: string;
}> {
  const { formPrompt, selectPrompt } = updateSpecifyUtils.getUpdatePackagePrompt();
  const update = await formPrompt.run();
  const install = await selectPrompt.run();
  return {
    update,
    install,
  };
}

export function getUpdatePackages({
  dependencies,
  devDependencies,
}: {
  dependencies: string; devDependencies: string;
}) {
  return {
    dependencies: dependencies.split(',').map((v) => v.trim()),
    devDependencies: devDependencies.split(',').map((v) => v.trim()),
  };
}

export function updateProjectDependencies(
  list: ProjectConfigType[],
  dependencies: string[],
  devDependencies: string[],
  isAdd: boolean,
): void {
  const isAddCommander = isAdd ? '' : '--package-lock-only';
  const task = list.map(({ cwd }) => () => {
    shell.cd(cwd);
    console.log(chalk.blue(`正在更新：${cwd} \n`));
    if (dependencies.length) {
      const dependenciesTxt = `npm i ${dependencies.join(' ')} -S ${isAddCommander}`;
      shell.exec(dependenciesTxt);
    }
    if (devDependencies.length) {
      const devDependenciesTxt = `npm i ${devDependencies.join(' ')} -D ${isAddCommander}`;
      shell.exec(devDependenciesTxt);
    }
  });
  task.forEach((v) => v());
}

export async function updateSpecify(paths: string[]): Promise<void> {
  const { update, install } = await updateSpecifyUtils.getUpdatePackageTxt();
  const { dependencies, devDependencies } = getUpdatePackages(update);
  console.log(`要更新的依赖有：\n
  dependencies
    ${dependencies.join('\n  ')}
  devDependencies
    ${devDependencies.join('\n  ')}
`);
  const list = await getPackagesConfig(paths);
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  const res: ProjectConfigType[] = await getMultiSelectPrompt(
    filterList,
    {
      opts: { message: '选择要更新对应依赖的项目' },
    },
  ).run();
  updateProjectDependencies(res, dependencies, devDependencies, install === '是');
  console.log(chalk.green('更新成功!!!'));
}
