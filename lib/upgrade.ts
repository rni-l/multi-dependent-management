import ora from 'ora';
import {
  ProjectPackageType, ProjectConfigType,
} from './types';
import {
  getPackagesConfig,
  findPackageProject,
  getConfirmPrompt,
  updateProjectDependencies,
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

export function getMultiSelectPrompt(list: ProjectConfigType[], options?: any): any {
  const choices = getChoices(list);
  return new MultiSelect(
    {
      ...options,
      choices,
      name: 'target',
      message: `需要更新的依赖(${choices.length})`,
      result(names: string[]) {
        return changeChoicesToProjectConfig(names, list);
      },
    },
  );
}

export async function upgrade(targetPath: string): Promise<void> {
  const spinner = ora('分析中...').start();
  const list = await getPackagesConfig(findPackageProject(targetPath), true);
  spinner.succeed('分析成功\t');
  // 为了 unit test 更方便 mock，所有这样写
  const prompt = upgradeUtils.getMultiSelectPrompt(list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[]);
  const res: ProjectConfigType[] = await prompt.run();
  const res2 = await getConfirmPrompt(res).run();
  if (res2) {
    updateProjectDependencies(res);
    console.log('处理成功!!!');
  }
}
