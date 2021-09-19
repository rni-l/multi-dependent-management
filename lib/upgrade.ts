import ora from 'ora';
import {
  ProjectPackageType, ProjectConfigType,
} from './types';
import { TARGET_DIR_PATH } from './config';
import {
  getPackagesConfig, find, getConfirmPrompt, updateProjectDependencies,
} from './utils';

const { MultiSelect } = require('enquirer');

function getChoices(list: ProjectConfigType[]) {
  return list.reduce((acc: { name: string; projectCdw: string; updateName: string; }[], v) => {
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

function getMultiSelectPrompt(list: ProjectConfigType[]) {
  const choices = getChoices(list);
  return new MultiSelect(
    {
      choices,
      name: 'target',
      message: `需要更新的依赖(${choices.length})`,
      result(names: string[]) {
        return names.reduce((acc: ProjectConfigType[], v) => {
          const choicesObj = choices.find((v3) => v === v3.name);
          const listObj = list.find((v2) => v2.cwd === choicesObj?.projectCdw) as ProjectConfigType;
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
      },
    },
  );
}

export default async () => {
  const spinner = ora('分析中...').start();
  const list = await getPackagesConfig(find(TARGET_DIR_PATH));
  spinner.succeed('分析成功\t');
  const prompt = getMultiSelectPrompt(list);
  const res: ProjectConfigType[] = await prompt.run();
  const prompt2 = getConfirmPrompt(res);
  const res2 = await prompt2.run();
  console.log(res2);
  if (res2) {
    updateProjectDependencies(res);
    console.log('处理成功!!!');
  }
};
