import { vol } from 'memfs';
import * as shellUtils from '../lib/shell';
import { p1, p2 } from './mockData/packageJsonData';
import * as utils from '../lib/utils';
import { ProjectConfigType } from '../lib/types';

let mockCache: string[] = [];

jest.mock('fs');
jest.mock('npm-check-updates');
jest.mock('ora');
jest.mock('shelljs', () => ({
  cd: jest.fn((txt: string) => {
    mockCache.push(txt);
  }),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  exec: jest.fn((txt: string) => {
    mockCache.push(txt);
  }),
}));
jest.mock('enquirer-editor', () => function () {
  return {
    run: () => Promise.resolve('ok'),
  };
});

describe('test lib/shell.ts', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromNestedJSON({
      p1: {
        'package.json': JSON.stringify(p1),
      },
      p2: {
        'package.json': JSON.stringify(p2),
      },
    }, '/abc');
  });

  describe('getInput', () => {
    it('获取输入内容', async () => {
      const prompt = await shellUtils.getInput({
        show: false,
      }).run();
      expect(prompt).toBe('ok');
    });
  });

  describe('getCommanders', () => {
    it('无输入，返回空数组', () => {
      expect(shellUtils.getCommanders()).toMatchObject([]);
    });
    it('输入多个值，使用 \n 换行，返回去空格的数组', () => {
      expect(shellUtils.getCommanders('a\n b \n c')).toMatchObject(['a', 'b', 'c']);
    });
  });

  describe('getConfirmIsEnterIndependentCommander', () => {
    it('选择确认，返回 false', async () => {
      const prompt = await shellUtils.getConfirmIsEnterIndependentCommander({ show: false });
      prompt.on('run', async () => {
        await prompt.submit();
      });
      const res = await prompt.run();
      expect(res).toBe(false);
    });
    it('选择确认，返回 true', async () => {
      const prompt = await shellUtils.getConfirmIsEnterIndependentCommander({ show: false });
      prompt.on('run', async () => {
        await prompt.keypress('y');
        prompt.submit();
      });
      const res = await prompt.run();
      expect(res).toBe(true);
    });
  });

  describe('getConfirmIsExecute', () => {
    it('选择确认，返回 false', async () => {
      const prompt = await shellUtils.getConfirmIsExecute({ show: false });
      prompt.on('run', async () => {
        await prompt.submit();
      });
      const res = await prompt.run();
      expect(res).toBe(false);
    });
    it('选择确认，返回 true', async () => {
      const prompt = await shellUtils.getConfirmIsExecute({ show: false });
      prompt.on('run', async () => {
        await prompt.keypress('y');
        prompt.submit();
      });
      const res = await prompt.run();
      expect(res).toBe(true);
    });
  });

  describe('executeTask', () => {
    it('传入任务数组，返回任务返回值的集合', async () => {
      const tasks = Array.from({ length: 3 }, (_, i) => () => Promise.resolve(i));
      const res = await shellUtils.executeTask(tasks);
      expect(res).toMatchObject([0, 1, 2]);
    });

    it('如果某个任务执行失败，返回 undefined', async () => {
      const tasks = Array.from({ length: 3 }, (_, i) => async () => {
        if (i === 1) throw Error('');
        return i;
      });
      const res = await shellUtils.executeTask(tasks);
      expect(res).toMatchObject([0, undefined, 2]);
    });
  });

  describe('getIndependentCommanders', () => {
    it('传入要执行的项目列表，返回每个项目要执行的命令', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      jest.spyOn(shellUtils, 'getInput').mockImplementation(() => ({
        run: () => Promise.resolve('a \n b'),
      }));
      const res = await shellUtils.getIndependentCommanders(list);
      expect(res).toMatchObject([
        ['a', 'b'],
        ['a', 'b'],
      ]);
    });
  });

  describe('getTasks', () => {
    it('根据项目列表，按顺序使用 shelljs 执行相关命令', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const res = await shellUtils.executeTask(shellUtils.getTasks(
        list,
        ['a'],
        [['b'], ['c']],
      ));
      expect(res).toMatchObject([true, true]);
      expect(mockCache).toMatchObject([
        '/abc/p1',
        'a',
        'b',
        '/abc/p2',
        'a',
        'c',
      ]);
    });
  });

  describe('getExecuteCommandersTxt', () => {
    it('根据项目和命令，生成日志', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const res = shellUtils.getExecuteCommandersTxt(
        list,
        ['a'],
        [['b'], ['c']],
      );
      expect(res).toBe(`
---- /abc/p1 ----
a
b
---- 结束 ----


---- /abc/p2 ----
a
c
---- 结束 ----
`);
    });
  });

  describe('executeShell', () => {
    beforeAll(() => {
      jest.spyOn(utils, 'getMultiSelectPrompt').mockImplementation(() => ({
        run: () => Promise.resolve([
          {
            cwd: '/abc/p1',
            packageJson: p1,
            packages: [],
          },
          {
            cwd: '/abc/p2',
            packageJson: p2,
            packages: [],
          },
        ]),
      }));
      jest.spyOn(shellUtils, 'getInput').mockImplementation(() => ({
        run: () => Promise.resolve('a'),
      }));
    });
    beforeEach(() => {
      mockCache = [];
    });
    afterAll(() => {
      jest.clearAllMocks();
    });
    it('终止执行，没有执行 shell 命令', async () => {
      jest.spyOn(shellUtils, 'getConfirmIsEnterIndependentCommander').mockImplementation(() => ({
        run: () => Promise.resolve(false),
      }));
      jest.spyOn(shellUtils, 'getConfirmIsExecute').mockImplementation(() => ({
        run: () => Promise.resolve(false),
      }));
      await shellUtils.executeShell(utils.findPackageProject('/abc'));
      expect(mockCache).toMatchObject([]);
    });
    it('确认执行 shell 命令', async () => {
      jest.spyOn(shellUtils, 'getConfirmIsEnterIndependentCommander').mockImplementation(() => ({
        run: () => Promise.resolve(false),
      }));
      jest.spyOn(shellUtils, 'getConfirmIsExecute').mockImplementation(() => ({
        run: () => Promise.resolve(true),
      }));
      await shellUtils.executeShell(utils.findPackageProject('/abc'));
      expect(mockCache).toMatchObject([
        '/abc/p1',
        'a',
        '/abc/p2',
        'a',
      ]);
    });
    it('输入各个项目独立的命令', async () => {
      jest.spyOn(shellUtils, 'getConfirmIsEnterIndependentCommander').mockImplementation(() => ({
        run: () => Promise.resolve(true),
      }));
      jest.spyOn(shellUtils, 'getConfirmIsExecute').mockImplementation(() => ({
        run: () => Promise.resolve(true),
      }));
      jest.spyOn(shellUtils, 'getIndependentCommanders').mockImplementation(() => Promise.resolve([
        ['b'],
        ['c'],
      ]));
      await shellUtils.executeShell(utils.findPackageProject('/abc'));
      expect(mockCache).toMatchObject([
        '/abc/p1',
        'a',
        'b',
        '/abc/p2',
        'a',
        'c',
      ]);
    });
  });
});
