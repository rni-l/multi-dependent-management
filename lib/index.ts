#!/usr/bin/env node

import path from 'path';
import program from './commander';
import { remove } from './remove';
import { upgrade } from './upgrade';
import { updateSpecify } from './updateSpecify';
import { executeShell } from './shell';

program.command('upgrade')
  .description('用于升级项目的依赖')
  .option('-p, --path <mode>', '要递归处理的路径')
  .action((env) => {
    if (!env.path) {
      console.log('请输入要处理的路径');
    } else {
      upgrade(path.resolve(env.path));
    }
  });

program.command('remove')
  .description('移除项目依赖')
  .option('-p, --path <mode>', '要递归处理的路径')
  .action((env) => {
    if (!env.path) {
      console.log('请输入要处理的路径');
    } else {
      remove(path.resolve(env.path));
    }
  });

program.command('update')
  .description('更新项目依赖')
  .option('-p, --path <mode>', '要递归处理的路径')
  .action((env) => {
    if (!env.path) {
      console.log('请输入要处理的路径');
    } else {
      updateSpecify(path.resolve(env.path));
    }
  });

program.command('shell')
  .description('执行 shell')
  .option('-p, --path <mode>', '要递归处理的路径')
  .action((env) => {
    if (!env.path) {
      console.log('请输入要处理的路径');
    } else {
      executeShell(path.resolve(env.path));
    }
  });

program.parse(process.argv);
