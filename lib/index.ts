#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import program from './commander';
import { remove } from './remove';
import { upgrade } from './upgrade';
import { updateSpecify } from './updateSpecify';
import { executeShell } from './shell';
import { findPackageProject } from './utils';
import { diff } from './diff';

function getCommonOption(target: Command) {
  return target.option('-p, --path <target path>', '要递归处理的路径')
    .option('-e --exclude <exclude path,exclude path2,exclude path3>', '要忽略的文件，用“,”隔开，不能带空格');
}

function checkPath(env: any, cb: (target: string[]) => any) {
  if (!env.path) {
    console.log('请输入要处理的路径');
    return;
  }
  const targetPath = findPackageProject(path.resolve(env.path), env.exclude);
  if (targetPath.length) {
    cb(targetPath);
  } else {
    console.log('没找到含有 package.json 项目');
  }
}

getCommonOption(
  program.command('upgrade')
    .description('用于升级项目的依赖'),
).action((env) => {
  checkPath(env, upgrade);
});

getCommonOption(
  program.command('remove')
    .description('移除项目依赖'),
).action((env) => {
  checkPath(env, remove);
});

getCommonOption(
  program.command('update')
    .description('更新项目依赖'),
).action((env) => {
  checkPath(env, updateSpecify);
});

getCommonOption(
  program.command('shell')
    .description('执行 shell'),
).action((env) => {
  checkPath(env, executeShell);
});

getCommonOption(
  program.command('diff')
    .description('查看项目依赖差异'),
).action((env) => {
  checkPath(env, diff);
});

program.parse(process.argv);
