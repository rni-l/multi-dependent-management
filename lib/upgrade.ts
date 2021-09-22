import ora from 'ora';
import {
  ProjectPackageType, ProjectConfigType,
} from './types';
import { TARGET_DIR_PATH } from './config';
import {
  getPackagesConfig, findPackageProject, getConfirmPrompt, updateProjectDependencies,
} from './utils';

const { MultiSelect } = require('enquirer');

type ChoiceItem = { name: string; projectCdw: string; updateName: string; }

function getChoices(list: ProjectConfigType[]): ChoiceItem[] {
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

function changeChoicesToProjectConfig(selectNames: string[],
  rawProjectConfig: ProjectConfigType[]): ProjectConfigType[] {
  const choices = getChoices(rawProjectConfig);
  return selectNames.reduce((acc: ProjectConfigType[], v) => {
    const choicesObj = choices.find((v3) => v === v3.name);
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

function getMultiSelectPrompt(list: ProjectConfigType[]): any {
  const choices = getChoices(list);
  return new MultiSelect(
    {
      choices,
      name: 'target',
      message: `需要更新的依赖(${choices.length})`,
      result(names: string[]) {
        return changeChoicesToProjectConfig(names, list);
      },
    },
  );
}

export {
  getChoices,
  getMultiSelectPrompt,
  changeChoicesToProjectConfig,
};

export default async (): Promise<void> => {
  const spinner = ora('分析中...').start();
  const list = await getPackagesConfig(findPackageProject(TARGET_DIR_PATH));
  spinner.succeed('分析成功\t');
  const prompt = getMultiSelectPrompt(list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[]);
  const res: ProjectConfigType[] = await prompt.run();
  const prompt2 = getConfirmPrompt(res);
  const res2 = await prompt2.run();
  if (res2) {
    updateProjectDependencies(res);
    console.log('处理成功!!!');
  }
};
