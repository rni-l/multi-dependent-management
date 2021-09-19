import fs from 'fs';
import semver from 'semver';
import ncu from 'npm-check-updates';
import { diff } from 'just-diff';
import {
  ObjectKey, ProjectPackageType, ProjectConfigType,
} from './types';
import {
  ignoreNames,
} from './config';

const { MultiSelect, Confirm } = require('enquirer');

function getVersion(version: string) {
  return semver.coerce(version).version;
}

function getPackageConfig(diffResult: { op: string; path: Array<string | number>; value: any },
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

function find(targetPath: string): string[] {
  const fileStat = fs.statSync(targetPath);
  const nodeProjects: string[] = [];
  if (!fileStat.isDirectory()) return [];
  fs.readdirSync(targetPath).forEach((v) => {
    if (ignoreNames.includes(v)) return;
    const curPath = `${targetPath}/${v}`;
    if (v === 'package.json') {
      nodeProjects.push(targetPath);
    }
    const childNodeProjects = find(curPath);
    nodeProjects.push(...childNodeProjects);
  });
  return nodeProjects;
}

async function getPackagesConfig(targetPaths: string[]) {
  const checkList: Promise<ProjectConfigType>[] = targetPaths
    // eslint-disable-next-line no-async-promise-executor
    .map((v) => new Promise(async (resolve) => {
      // 分析对象项目的 package.json
      const targetPackageJson = JSON.parse(fs.readFileSync(`${v}/package.json`, { encoding: 'utf-8' }));
      const output: ProjectConfigType = {
        cwd: v,
        packageJson: targetPackageJson,
        packages: [],
      };
      const ncuResult = await ncu.run({
        packageFile: `${v}/package.json`,
        upgrade: false,
        jsonDeps: true,
      });
      const ncuObjectDependenciesResult: any = ncuResult.dependencies;
      const ncuObjectDevDependenciesResult: any = ncuResult.devDependencies;

      diff(targetPackageJson.dependencies, ncuObjectDependenciesResult).forEach((diffResult) => {
        output.packages.push(getPackageConfig(diffResult, targetPackageJson.dependencies, false));
      });
      diff(targetPackageJson.devDependencies,
        ncuObjectDevDependenciesResult).forEach((diffResult) => {
        output.packages.push(getPackageConfig(diffResult, targetPackageJson.devDependencies, true));
      });

      resolve(output);
    }));
  return Promise.all(checkList);
}

function getConfirmPrompt(list: ProjectConfigType[]): any {
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

function updateProjectDependencies(list: ProjectConfigType[]) {
  list.forEach(({ cwd, packageJson, packages }) => {
    const data = packageJson;
    packages.forEach(({ newVersion, name, isDevDependencies }) => {
      if (isDevDependencies) {
        data.devDependencies[name] = newVersion;
      } else {
        data.dependencies[name] = newVersion;
      }
    });
    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(data, null, '  '));
  });
}

export {
  getPackagesConfig,
  getVersion,
  find,
  getConfirmPrompt,
  updateProjectDependencies,
};
