import fs from 'fs';
import chalk from 'chalk';
import {
  ProjectConfigType,
} from './types';
import {
  getPackagesConfig,
  getMultiSelectPrompt,
} from './utils';
import * as removeUtils from './remove';

const { Input } = require('enquirer');

export function getRemovePackageTxt(opts?: any): any {
  return new Input({
    ...opts,
    message: '要移除什么依赖？(用逗号分割，例如：vue,vue-router,vuex)',
  });
}

export async function getRemovePackages(): Promise<string[]> {
  const stringRemovePackages: string = await removeUtils.getRemovePackageTxt().run();
  return stringRemovePackages.split(',').map((v) => v.trim());
}

type ChoiceItem = { name: string; cwd: string; }

export function getNotExistDependenciesTxt(item: ProjectConfigType, removePackages: string[]): string {
  const { dependencies, devDependencies } = item.packageJson;
  return removePackages.reduce((acc: string[], v) => {
    if ((!dependencies || !dependencies[v])
        && (!devDependencies || !devDependencies[v])) {
      acc.push(v);
    }
    return acc;
  }, []).join(', ');
}

export function getChoices(list: ProjectConfigType[], removePackages: string[]): ChoiceItem[] {
  return list.reduce((acc: ChoiceItem[], v) => {
    let txt = getNotExistDependenciesTxt(v, removePackages);
    if (txt) {
      txt = `(不存在以下依赖：${txt})`;
    }
    acc.push({
      name: `${v.cwd}${txt}`,
      cwd: v.cwd,
    });
    return acc;
  }, []);
}

export function changeChoicesToProjectConfig(selectNames: string[],
  rawProjectConfig: ProjectConfigType[],
  removePackages: string[]): ProjectConfigType[] {
  const choices = getChoices(rawProjectConfig, removePackages);
  return selectNames.reduce((acc: ProjectConfigType[], v) => {
    const choicesObj = choices.find((v2) => v === v2.name)!;
    const item = rawProjectConfig.find((v2) => v2.cwd === choicesObj.cwd)!;
    acc.push(item);
    return acc;
  }, []);
}

export function removeProjectDependencies(list: ProjectConfigType[], removePackages: string[]): void {
  list.forEach(({ cwd, packageJson }) => {
    const data = packageJson;
    removePackages.forEach((v) => {
      if (data.dependencies && data.dependencies[v]) {
        delete data.dependencies[v];
      }
      if (data.devDependencies && data.devDependencies[v]) {
        delete data.devDependencies[v];
      }
    });
    console.log(chalk.blue(`正在移除 ${cwd} 的 ${removePackages.join(', ')}`));
    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(data, null, '  '));
    console.log(chalk.green(`${cwd} 移除完成~`));
  });
}

export async function remove(paths: string[]): Promise<void> {
  const removePackages = await getRemovePackages();
  console.log(chalk.red(`要移除的依赖有：\n  ${removePackages.join('\n  ')}`));
  const list = await getPackagesConfig(paths);
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  const res: ProjectConfigType[] = await getMultiSelectPrompt(
    filterList,
    {
      getChoices,
      changeChoicesToProjectConfig,
      opts: { message: '选择移除对应依赖的项目' },
    },
    removePackages,
  ).run();
  removeProjectDependencies(res, removePackages);
  console.log(chalk.red('\n全部移除成功!!!'));
}
