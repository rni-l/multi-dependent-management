import chalk from 'chalk';
import { ProjectConfigType } from './types';
import { getMultiSelectPrompt, getPackagesConfig } from './utils';
import * as shellUtils from './shell';

const { Confirm } = require('enquirer');
const EditorPrompt = require('enquirer-editor');
const shell = require('shelljs');

type Task<T> = () => Promise<T>

const INPUT_TXT = '请输入要执行的命令，使用换行分割命令，一行一句命令，按顺序执行.';

export function getInput(opts?: any) {
  return new EditorPrompt({
    ...opts,
    type: 'editor',
  });
}

export function getCommanders(shellTxt?: string) {
  if (!shellTxt) return [];
  return shellTxt.split('\n').map((v) => (v ? v.trim() : '')).filter((v) => v);
}

export function getConfirmIsEnterIndependentCommander(opts?: any) {
  return new Confirm({
    ...opts,
    name: 'isEnter',
    message: '是否为各个项目输入独立执行命令？',
  });
}

export function getConfirmIsExecute(opts?: any) {
  return new Confirm({
    ...opts,
    name: 'isExecute',
    message: '查看命令清单，确认是否要执行？',
  });
}

export async function executeTask<T>(tasks: Task<(T | undefined)>[]): Promise<(T | undefined)[]> {
  const output: (T | undefined)[] = [];
  if (tasks.length) {
    const task = tasks[0];
    try {
      const res = await task();
      output.push(res);
    } catch (error) {
      output.push(undefined);
    }
    tasks.shift();
    const res2 = await executeTask(tasks);
    output.push(...res2);
  }
  return output;
}

export async function getIndependentCommanders(list: ProjectConfigType[]) {
  const res = await executeTask(list.map((v) => async () => {
    const shellTxt = await shellUtils.getInput({
      message: `请输入要执行的命令.(${v.cwd})`,
    }).run();
    return getCommanders(shellTxt);
  }));
  return res;
}

export function getTasks(
  list: ProjectConfigType[],
  commonCommanders: string[],
  independentCommanders: string[][],
) {
  return list.map((v, i) => async (): Promise<boolean> => new Promise((resolver) => {
    console.log(chalk.yellow(`\n-------- ${v.cwd} --------`));
    shell.cd(v.cwd);
    commonCommanders.forEach((commander) => {
      console.log(chalk.cyan(`\n执行 ${commander} --------`));
      shell.exec(commander);
      console.log(chalk.cyan(`${commander} 结束--------`));
    });
    if (independentCommanders.length) {
      independentCommanders[i].forEach((commander) => {
        console.log(chalk.cyan(`\n执行 ${commander} --------`));
        shell.exec(commander);
        console.log(chalk.cyan(`${commander} 结束--------`));
      });
    }
    console.log(chalk.yellow('\n-------- end --------'));
    resolver(true);
  }));
}

export function getExecuteCommandersTxt(
  list: ProjectConfigType[],
  commonCommanders: string[],
  independentCommanders: (string)[][],
) {
  return list.map((v, i) => `
---- ${v.cwd} ----
${commonCommanders.join('\n')}
${independentCommanders[i]?.join('\n')}
---- 结束 ----
`).join('\n');
}

export async function getMultiList(paths: string[]) {
  const list = await getPackagesConfig(paths);
  const filterList = list.filter((v) => typeof v !== 'boolean') as ProjectConfigType[];
  const selectList: ProjectConfigType[] = await getMultiSelectPrompt(
    filterList,
    {
      opts: { message: '选择要执行的项目' },
    },
  ).run();
  return selectList;
}

export async function executeShell(paths: string[]) {
  const selectList = await shellUtils.getMultiList(paths);
  const commonShell = await shellUtils.getInput({
    message: `${INPUT_TXT}(选择的项目都会执行)`,
  }).run();
  const commonCommanders = shellUtils.getCommanders(commonShell);
  const isEnter = await shellUtils.getConfirmIsEnterIndependentCommander().run();
  let independentCommanders: (string)[][] = [];
  if (isEnter) {
    const tmp = await shellUtils.getIndependentCommanders(selectList);
    independentCommanders = tmp.map((v) => v || []);
  }

  console.log(`\n${getExecuteCommandersTxt(selectList, commonCommanders, independentCommanders)}`);
  const isExecute = await shellUtils.getConfirmIsExecute().run();
  if (!isExecute) {
    console.log(chalk.red('终止执行'));
    return;
  }

  console.log(chalk.green('\n开始执行命令~'));
  await shellUtils.executeTask<boolean>(shellUtils.getTasks(
    selectList,
    commonCommanders,
    independentCommanders,
  ));
  console.log(chalk.green('\n所有命令执行完毕!!!'));
}
