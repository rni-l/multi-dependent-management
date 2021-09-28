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

function getPaths(env: any) {
  return findPackageProject(path.resolve(env.path), env.exclude);
}

getCommonOption(
  program.command('upgrade')
    .description('用于升级项目的依赖'),
).action((env) => {
  if (!env.path) {
    console.log('请输入要处理的路径');
  } else {
    upgrade(getPaths(env));
  }
});

getCommonOption(
  program.command('remove')
    .description('移除项目依赖'),
).action((env) => {
  if (!env.path) {
    console.log('请输入要处理的路径');
  } else {
    remove(getPaths(env));
  }
});

getCommonOption(
  program.command('update')
    .description('更新项目依赖'),
).action((env) => {
  if (!env.path) {
    console.log('请输入要处理的路径');
  } else {
    updateSpecify(getPaths(env));
  }
});

getCommonOption(
  program.command('shell')
    .description('执行 shell'),
).action((env) => {
  if (!env.path) {
    console.log('请输入要处理的路径');
  } else {
    executeShell(getPaths(env));
  }
});

getCommonOption(
  program.command('diff')
    .description('查看项目依赖差异'),
).action((env) => {
  if (!env.path) {
    console.log('请输入要处理的路径');
  } else {
    diff(getPaths(env));
  }
});

program.parse(process.argv);
