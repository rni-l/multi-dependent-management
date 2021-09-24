import ora from 'ora';
import chalk from 'chalk';
import {
  ProjectConfigType,
} from './types';
import {
  getPackagesConfig,
  findPackageProject,
} from './utils';
import * as updateSpecifyUtils from './updateSpecify';

const shell = require('shelljs');
const { prompt, MultiSelect } = require('enquirer');

export function getUpdatePackageTxt(opts?: any): Promise<
  {
    update: { dependencies: string; devDependencies: string; };
    install: string;
  }
> {
  // eslint-disable-next-line new-cap
  return prompt([
    {
      ...opts,
      type: 'form',
      name: 'update',
      message: '输入需要更新的依赖(用逗号分割，例如：vue@2.6.12,vue-router,vuex@latest):',
      choices: [
        { name: 'dependencies', message: 'dependencies 依赖' },
        { name: 'devDependencies', message: 'devDependencies 依赖' },
      ],
    },
    {
      ...opts,
      type: 'select',
      name: 'install',
      message: '是否安装依赖到 node_module:',
      choices: ['是', '否'],
    },
  ]);
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

type ChoiceItem = { name: string; cwd: string; }

export function getChoices(list: ProjectConfigType[]): ChoiceItem[] {
  return list.reduce((acc: ChoiceItem[], v) => {
    acc.push({
      name: `${v.cwd}`,
      cwd: v.cwd,
    });
    return acc;
  }, []);
}

export function changeChoicesToProjectConfig(selectNames: string[],
  rawProjectConfig: ProjectConfigType[]): ProjectConfigType[] {
  const choices = getChoices(rawProjectConfig);
  return selectNames.reduce((acc: ProjectConfigType[], v) => {
    const choicesObj = choices.find((v2) => v === v2.name)!;
    const item = rawProjectConfig.find((v2) => v2.cwd === choicesObj.cwd)!;
    acc.push(item);
    return acc;
  }, []);
}

export function getMultiSelectPrompt(list: ProjectConfigType[], opts?: any): any {
  const choices = getChoices(list);
  return new MultiSelect(
    {
      ...opts,
      choices,
      name: 'target',
      message: '选择要更新对应依赖的项目',
      result(names: string[]) {
        return changeChoicesToProjectConfig(names, list);
      },
    },
  );
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

export async function updateSpecify(targetPath: string): Promise<void> {
  const { update, install } = await updateSpecifyUtils.getUpdatePackageTxt();
  const { dependencies, devDependencies } = getUpdatePackages(update);
  console.log(`要更新的依赖有：\n
  dependencies
    ${dependencies.join('\n  ')}
  devDependencies
    ${devDependencies.join('\n  ')}
`);
  const spinner = ora('分析中...').start();
  const list = await getPackagesConfig(findPackageProject(targetPath));
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  spinner.succeed('分析成功\t');
  const res: ProjectConfigType[] = await updateSpecifyUtils.getMultiSelectPrompt(filterList).run();
  updateProjectDependencies(res, dependencies, devDependencies, install === '是');
  console.log(chalk.green('更新成功!!!'));
}
