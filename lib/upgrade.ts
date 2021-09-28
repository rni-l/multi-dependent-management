import ora from 'ora';
import chalk from 'chalk';
import {
  ProjectPackageType, ProjectConfigType,
} from './types';
import {
  getPackagesConfig,
  getConfirmPrompt,
  updateProjectDependencies,
  getMultiSelectPrompt,
} from './utils';
import * as upgradeUtils from './upgrade';

const { MultiSelect } = require('enquirer');

type ChoiceItem = { name: string; projectCdw: string; updateName: string; }

export function getChoices(list: ProjectConfigType[]): ChoiceItem[] {
  return list.reduce((acc: ChoiceItem[], v) => {
    v.packages.forEach((p) => {
      acc.push({
        name: `${v.cwd} - ${p.name} - ${p.oldVersion} -> ${p.newVersion}`,
        projectCdw: v.cwd,
        updateName: p.name,
      });
    });
    return acc;
  }, []);
}

export function changeChoicesToProjectConfig(selectNames: string[],
  rawProjectConfig: ProjectConfigType[]): ProjectConfigType[] {
  const choices = getChoices(rawProjectConfig);
  return selectNames.reduce((acc: ProjectConfigType[], v) => {
    const choicesObj = choices.find((v2) => v === v2.name);
    const listObj = rawProjectConfig.find((v2) => v2.cwd === choicesObj?.projectCdw) as ProjectConfigType;
    const dependenciesObj = listObj
      .packages.find((v2) => v2.name === choicesObj?.updateName) as ProjectPackageType;
    let project = acc.find((v2) => choicesObj?.projectCdw === v2.cwd);
    if (!project) {
      project = {
        cwd: choicesObj?.projectCdw as string,
        packageJson: listObj.packageJson,
        packages: [],
      };
      project.packages.push(dependenciesObj);
      acc.push(project);
    } else {
      project.packages.push(dependenciesObj);
    }
    return acc;
  }, []);
}

export function getSelectProjectPaths(paths: string[], opts: any = {}) {
  return new MultiSelect(
    {
      ...opts,
      choices: paths,
      name: 'target',
      message: '选择需要更新的项目',
    },
  );
}

export async function getMultiSelectProject(paths: string[]) {
  const selectPaths = await upgradeUtils.getSelectProjectPaths(paths).run();
  const spinner = ora('分析中...').start();
  const list = await getPackagesConfig(selectPaths, true);
  spinner.succeed('分析成功\t');
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  return filterList;
}

export async function upgrade(paths: string[]): Promise<void> {
  const list = await upgradeUtils.getMultiSelectProject(paths);
  const res: ProjectConfigType[] = await getMultiSelectPrompt(
    list,
    {
      getChoices,
      changeChoicesToProjectConfig,
      opts: { message: `需要更新的依赖(${getChoices(list).length})` },
    },
  ).run();
  const res2 = await getConfirmPrompt(res).run();
  if (res2) {
    updateProjectDependencies(res);
    console.log(chalk.green('\n升级成功!!!'));
  }
}
