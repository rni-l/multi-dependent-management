import fs from 'fs';
import semver from 'semver';
import ncu from 'npm-check-updates';
import { diff } from 'just-diff';
import chalk from 'chalk';
import {
  ObjectKey, ProjectPackageType, ProjectConfigType,
} from './types';
import {
  ignoreNames,
} from './config';

const { Confirm, MultiSelect } = require('enquirer');
const minimatch = require('minimatch');

export function getVersion(version: string): string {
  return semver.coerce(version).version;
}

export function semverLt(left: string, right: string) {
  return semver.lt(getVersion(left), getVersion(right));
}

export function getPackageConfig(diffResult: { op: string; path: Array<string | number>; value: any },
  dependencies: ObjectKey<string>, isDev: boolean): ProjectPackageType {
  const name = diffResult.path[0] as string;
  const oldVersion = dependencies[name];
  const newVersion = diffResult.value;
  return {
    name,
    oldVersion,
    newVersion,
    isUpdate: true,
    updateType: semver.diff(getVersion(oldVersion), getVersion(newVersion)),
    isDevDependencies: isDev,
  };
}

export function findPackageProject(targetPath: string, exclude = ''): string[] {
  const excludes = [
    ...exclude.split(',').map((v) => v.trim()),
    ...ignoreNames,
  ];
  const fileStat = fs.statSync(targetPath);
  const nodeProjects: string[] = [];
  if (!fileStat.isDirectory()) return [];
  const isIgnore = excludes.some((excludePatten) => minimatch(targetPath, excludePatten));
  fs.readdirSync(targetPath).forEach((v) => {
    const curPath = `${targetPath}/${v}`;
    if (!isIgnore && v === 'package.json') {
      nodeProjects.push(targetPath);
    }
    const childNodeProjects = findPackageProject(curPath, exclude);
    nodeProjects.push(...childNodeProjects);
  });
  return nodeProjects;
}

export async function getPackagesConfig(targetPaths: string[], isCheckUpdate?: boolean): Promise<(ProjectConfigType | boolean)[]> {
  const checkList: Promise<ProjectConfigType | boolean>[] = targetPaths
    // eslint-disable-next-line no-async-promise-executor
    .map((v) => new Promise(async (resolve) => {
      try {
        // 分析对象项目的 package.json
        const targetPackageJson = JSON.parse(fs.readFileSync(`${v}/package.json`, { encoding: 'utf-8' }));
        const output: ProjectConfigType = {
          cwd: v,
          packageJson: {
            ...targetPackageJson,
            dependencies: targetPackageJson.dependencies || {},
            devDependencies: targetPackageJson.devDependencies || {},
          },
          packages: [],
        };
        if (isCheckUpdate) {
          const ncuResult = await ncu.run({
            packageFile: `${v}/package.json`,
            upgrade: false,
            jsonDeps: true,
          });
          const ncuObjectDependenciesResult: any = ncuResult.dependencies;
          const ncuObjectDevDependenciesResult: any = ncuResult.devDependencies;

          if (targetPackageJson.dependencies) {
            diff(targetPackageJson.dependencies, ncuObjectDependenciesResult).forEach((diffResult) => {
              output.packages.push(getPackageConfig(diffResult, targetPackageJson.dependencies, false));
            });
          }
          if (targetPackageJson.devDependencies) {
            diff(targetPackageJson.devDependencies,
              ncuObjectDevDependenciesResult).forEach((diffResult) => {
              output.packages.push(getPackageConfig(diffResult, targetPackageJson.devDependencies, true));
            });
          }
        }

        resolve(output);
      } catch (error) {
        resolve(false);
      }
    }));
  return Promise.all(checkList);
}

export function getConfirmPrompt(list: ProjectConfigType[]): any {
  return new Confirm({
    name: 'data',
    message: `
将会更新以下依赖：
${list.reduce((acc, v) => {
    const txt = `
更新项目：${v.cwd}
${v.packages.map((v2) => `  ${v2.name}@${v2.oldVersion} -> ${v2.newVersion}；${v2.isDevDependencies ? 'dev' : ''}`).join('\n')}
`;
    return acc + txt;
  }, '')}
是否确定？`,
  });
}

export function updateProjectDependencies(list: ProjectConfigType[]): void {
  list.forEach(({ cwd, packageJson, packages }) => {
    const data = packageJson;
    packages.forEach(({ newVersion, name, isDevDependencies }) => {
      if (isDevDependencies && data.devDependencies) {
        data.devDependencies[name] = newVersion;
      } else if (!isDevDependencies && data.dependencies) {
        data.dependencies[name] = newVersion;
      }
    });
    // console.log(chalk.blue(`正在升级 ${cwd}`));
    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(data, null, '  '));
    console.log(chalk.green(`${cwd} 升级完成~`));
  });
}

type ChoiceItem = { name: string; cwd: string; }
type CommonGetChoices = (list: ProjectConfigType[], ...args: any[]) => any[]
type CommonChangeChoicesToProjectConfig = (
  selectNames: string[],
  rawProjectConfig: ProjectConfigType[],
  ...args: any[]
) => any[]

export function commonGetChoices(list: ProjectConfigType[]): ChoiceItem[] {
  return list.reduce((acc: ChoiceItem[], v) => {
    acc.push({
      name: `${v.cwd}`,
      cwd: v.cwd,
    });
    return acc;
  }, []);
}

export function commonChangeChoicesToProjectConfig(
  selectNames: string[],
  rawProjectConfig: ProjectConfigType[],
): ProjectConfigType[] {
  const choices = commonGetChoices(rawProjectConfig);
  return selectNames.reduce((acc: ProjectConfigType[], v) => {
    const choicesObj = choices.find((v2) => v === v2.name)!;
    const item = rawProjectConfig.find((v2) => v2.cwd === choicesObj.cwd)!;
    acc.push(item);
    return acc;
  }, []);
}

export function getMultiSelectPrompt(
  list: ProjectConfigType[],
  {
    getChoices,
    changeChoicesToProjectConfig,
    opts,
  }: {
    getChoices?: CommonGetChoices,
    changeChoicesToProjectConfig?: CommonChangeChoicesToProjectConfig,
    opts?: any
  },
  ...args: any[]
): any {
  const choices = getChoices ? getChoices(list, ...args) : commonGetChoices(list);
  return new MultiSelect(
    {
      ...opts,
      choices,
      name: 'target',
      result(names: string[]) {
        return changeChoicesToProjectConfig ? changeChoicesToProjectConfig(names, list, ...args) : commonChangeChoicesToProjectConfig(names, list);
      },
    },
  );
}
