import fs from 'fs';
import chalk from 'chalk';
import {
  ProjectConfigType, ProjectPackageType,
} from './types';
import {
  getPackagesConfig,
  getMultiSelectPrompt,
  semverLt,
  updateProjectDependencies,
} from './utils';
import * as diffUtils from './diff';

const { Confirm } = require('enquirer');

export function getConfirm(opts?: any) {
  return new Confirm({
    ...opts,
    name: 'confirm',
    message: '是否要进行更新？',
  });
}

export function getMaxVersionObj(list: ProjectConfigType[]) {
  const maxVersionObj: { [key: string]: string } = {};
  list.forEach(({ packageJson }) => {
    const { dependencies, devDependencies } = packageJson;
    if (dependencies) {
      Object.entries(dependencies as { [key: string]: string }).forEach(([key, value]) => {
        if (!maxVersionObj[key] || semverLt(maxVersionObj[key], value)) {
          maxVersionObj[key] = value;
        }
      });
    }
    if (devDependencies) {
      Object.entries(devDependencies as { [key: string]: string }).forEach(([key, value]) => {
        if (!maxVersionObj[key] || semverLt(maxVersionObj[key], value)) {
          maxVersionObj[key] = value;
        }
      });
    }
  });
  return maxVersionObj;
}

export function log(packageKey: string, target: ProjectConfigType, maxVersionObj: { [key: string]: string }) {
  const dependencies = target.packageJson[packageKey] as { [key: string]: string };
  const arr: ProjectPackageType[] = [];
  if (dependencies) {
    Object.entries(dependencies).forEach(([key, version]) => {
      if (version !== maxVersionObj[key]) {
        arr.push({
          name: key,
          oldVersion: version,
          newVersion: maxVersionObj[key],
          isUpdate: true,
          updateType: '',
          isDevDependencies: packageKey === 'devDependencies',
        });
      }
    });
    if (arr.length) {
      console.log(chalk.green(`------ ${packageKey} ------`));
      arr.forEach(({ name, oldVersion, newVersion }) => {
        console.log(`${name}: ${oldVersion}; 最高版本: ${chalk.red(newVersion)}`);
      });
      console.log(chalk.green(`------ ${packageKey} ------`));
    }
  }
  return arr;
}

export async function diff(paths: string[]): Promise<boolean> {
  const list = await getPackagesConfig(paths);
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  const res: ProjectConfigType[] = await getMultiSelectPrompt(
    filterList,
    {
      opts: { message: '选择要对比的项目' },
    },
  ).run();
  // 获取最高版本
  const maxVersionObj = diffUtils.getMaxVersionObj(res);
  res.forEach((target) => {
    console.group(target.cwd);
    const packages1 = diffUtils.log('dependencies', target, maxVersionObj);
    const packages2 = diffUtils.log('devDependencies', target, maxVersionObj);
    console.groupEnd();
    target.packages.push(...packages1, ...packages2);
  });
  const isUpdate = await diffUtils.getConfirm().run();
  if (!isUpdate) {
    console.log('结束~');
    return false;
  }
  updateProjectDependencies(res);
  return true;
}
