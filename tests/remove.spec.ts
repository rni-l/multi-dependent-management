import { vol } from 'memfs';
import * as removeUtils from '../lib/remove';
import { p1, p2 } from './mockData/packageJsonData';
import * as utils from '../lib/utils';
import { ProjectConfigType } from '../lib/types';

jest.mock('fs');
jest.mock('npm-check-updates');
jest.mock('ora');

describe('test lib/remove.ts', () => {
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

  describe('getRemovePackageTxt', () => {
    it('输入要移除的依赖', (done) => {
      const prompt = removeUtils.getRemovePackageTxt({
        show: false,
      });
      prompt.once('run', async () => {
        await prompt.keypress('v');
        await prompt.keypress('u');
        await prompt.keypress('e');
        await prompt.keypress(' ');
        await prompt.keypress(',');
        await prompt.keypress('a');
        await prompt.keypress('b');
        await prompt.keypress('c');
        await prompt.submit();
      });

      prompt.run()
        .then((value: string) => {
          expect(value).toBe('vue ,abc');
          done();
        });
    });
  });

  describe('getRemovePackages', () => {
    it('输入单个依赖字符串', async () => {
      jest.spyOn(removeUtils, 'getRemovePackageTxt').mockImplementationOnce(() => ({
        run: () => Promise.resolve('a1'),
      }));
      const res = await removeUtils.getRemovePackages();
      expect(res).toMatchObject(['a1']);
    });
    it('输入多个依赖字符串，用逗号隔开，并移除空格', async () => {
      jest.spyOn(removeUtils, 'getRemovePackageTxt').mockImplementationOnce(() => ({
        run: () => Promise.resolve('a1, a2, a3  ,a4 '),
      }));
      const res = await removeUtils.getRemovePackages();
      expect(res).toMatchObject(['a1', 'a2', 'a3', 'a4']);
    });
  });

  describe('getNotExistDependenciesTxt', () => {
    it('根据解析后的包信息和要移除的包，组合生成提示文本', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1'])) as ProjectConfigType[];
      expect(removeUtils.getNotExistDependenciesTxt(list[0], ['a4', 'a5']))
        .toBe('a4, a5');
    });
    it('要移除的包，对应的项目都存在，返回空文本', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1'])) as ProjectConfigType[];
      expect(removeUtils.getNotExistDependenciesTxt(list[0], ['a1', 'a2']))
        .toBe('');
    });
  });

  describe('getChoices', () => {
    it('获取 enquirer MultiSelect 的选项', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const res = removeUtils.getChoices(list, ['a4', 'a5', 'a3']);
      expect(res).toMatchObject([
        {
          name: '/abc/p1(不存在以下依赖：a4, a5)',
          cwd: '/abc/p1',
        },
        {
          name: '/abc/p2(不存在以下依赖：a4, a5)',
          cwd: '/abc/p2',
        },
      ]);
    });
  });

  describe('changeChoicesToProjectConfig', () => {
    it('将 MultiSelect 选项值转为包信息', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const res = removeUtils.changeChoicesToProjectConfig(
        ['/abc/p1(不存在以下依赖：a4)', '/abc/p2(不存在以下依赖：a4)'],
        list,
        ['a4', 'a3'],
      );
      expect(res).toMatchObject(list);
    });
  });

  describe('getMultiSelectPrompt', () => {
    it('将 MultiSelect 选项值转为包信息', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const prompt = removeUtils.getMultiSelectPrompt(
        list,
        ['a4', 'a3'],
        {
          show: false,
        },
      );
      expect(prompt.options.message).toBe('选择移除对应依赖的项目');
      prompt.on('run', async () => {
        await prompt.keypress(' ');
        await prompt.keypress(null, { name: 'down' });
        await prompt.keypress(' ');
        await prompt.submit();
      });
      prompt.run()
        .then((res) => {
          expect(res).toMatchObject([
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
          ]);
        });
    });
    it('没有选择，返回 []', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const prompt = removeUtils.getMultiSelectPrompt(
        list,
        ['a4', 'a3'],
        {
          show: false,
        },
      );
      expect(prompt.options.message).toBe('选择移除对应依赖的项目');
      prompt.on('run', async () => {
        await prompt.submit();
      });
      prompt.run()
        .then((res) => {
          expect(res).toMatchObject([]);
        });
    });
  });

  describe('removeProjectDependencies', () => {
    it('根据要移除的依赖信息，修改对应项目的 package.json', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      removeUtils.removeProjectDependencies(list, ['a1', 'a3']);
      const p1Data = JSON.parse(vol.readFileSync('/abc/p1/package.json', { encoding: 'utf-8' }) as string);
      expect(p1Data.dependencies.a1).toBe(undefined);
      expect(p1Data.dependencies.a2).toBe(p1.dependencies.a2);
      expect(p1Data.devDependencies.a3).toBe(undefined);
      const p2Data = JSON.parse(vol.readFileSync('/abc/p2/package.json', { encoding: 'utf-8' }) as string);
      expect(p2Data.dependencies.a1).toBe(undefined);
      expect(p2Data.dependencies.a2).toBe(p2.dependencies.a2);
      expect(p2Data.devDependencies.a3).toBe(undefined);
    });
  });

  describe('remove', () => {
    afterEach(() => {
      jest.resetModules();
    });
    it('移除对应依赖', async () => {
      jest.spyOn(removeUtils, 'getMultiSelectPrompt').mockImplementation(() => ({
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
      jest.spyOn(removeUtils, 'getRemovePackageTxt').mockImplementationOnce(() => ({
        run: () => Promise.resolve('a1, a3, a5'),
      }));
      await removeUtils.remove('/abc');
      const p1Data = JSON.parse(vol.readFileSync('/abc/p1/package.json', { encoding: 'utf-8' }) as string);
      expect(p1Data.dependencies.a1).toBe(undefined);
      expect(p1Data.dependencies.a2).toBe(p1.dependencies.a2);
      expect(p1Data.devDependencies.a3).toBe(undefined);
      const p2Data = JSON.parse(vol.readFileSync('/abc/p2/package.json', { encoding: 'utf-8' }) as string);
      expect(p2Data.dependencies.a1).toBe(undefined);
      expect(p2Data.dependencies.a2).toBe(p2.dependencies.a2);
      expect(p2Data.devDependencies.a3).toBe(undefined);
    });
  });
});
