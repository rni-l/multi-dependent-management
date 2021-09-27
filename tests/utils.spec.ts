import { vol } from 'memfs';
import { omit } from 'lodash';
import { ProjectConfigType } from '../lib/types';
import {
  getPackageConfig,
  getVersion,
  findPackageProject,
  getPackagesConfig,
  updateProjectDependencies,
  getConfirmPrompt,
  commonChangeChoicesToProjectConfig,
  getMultiSelectPrompt,
  commonGetChoices,
} from '../lib/utils';
import { p1, p2, maxVersion } from './mockData/packageJsonData';

jest.mock('fs');
jest.mock('npm-check-updates');

describe('test lib/utils.ts', () => {
  describe('getVersion', () => {
    it('传入 ~1.2.0，返回 1.2.0', () => {
      expect(getVersion('~1.2.0')).toBe('1.2.0');
    });
    it('传入 ^1.2.0，返回 1.2.0', () => {
      expect(getVersion('^1.2.0')).toBe('1.2.0');
    });
    it('传入 v1.2.0，返回 1.2.0', () => {
      expect(getVersion('v1.2.0')).toBe('1.2.0');
    });
  });

  describe('getPackageConfig', () => {
    it('传入 diffResult, dependencies 和 isDev，返回一个包的信息', () => {
      const res = getPackageConfig(
        { op: 'replace', path: ['abc'], value: '1.1.0' },
        { abc: '1.0.1' },
        false,
      );
      expect(res).toMatchObject({
        name: 'abc',
        oldVersion: '1.0.1',
        newVersion: '1.1.0',
        isUpdate: true,
        updateType: 'minor',
        isDevDependencies: false,
      });
    });
    it('传入 diffResult, dependencies 和 isDev，isDev 为 true，版本升级为 major，返回一个包的信息', () => {
      const res = getPackageConfig(
        { op: 'replace', path: ['abc'], value: '2.1.0' },
        { abc: '1.0.1' },
        true,
      );
      expect(res).toMatchObject({
        name: 'abc',
        oldVersion: '1.0.1',
        newVersion: '2.1.0',
        isUpdate: true,
        updateType: 'major',
        isDevDependencies: true,
      });
    });
  });

  describe('findPackageProject', () => {
    beforeEach(() => {
      vol.reset();
    });

    it('递归目标地址所有目录，获取带有 package.json 的绝对路径', async () => {
      vol.fromNestedJSON({
        a: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
        },
        b: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
        },
      }, '/abc');
      const res = await findPackageProject('/abc');
      expect(res.length).toBe(4);
      expect(res[0]).toBe('/abc/a/d');
      expect(res[1]).toBe('/abc/a');
      expect(res[2]).toBe('/abc/b/d');
      expect(res[3]).toBe('/abc/b');
    });

    it('递归目标地址所有目录，过滤 node_modules 目录，获取带有 package.json 的绝对路径', async () => {
      vol.fromNestedJSON({
        a: {
          node_modules: {
            'package.json': 'ok',
            abc: '',
            d: {
              'package.json': 'ok',
            },
          },
        },
        b: {
          'package.json': 'ok',
          abc: '',
          d: {
            node_modules: {
              'package.json': 'ok',
            },
          },
        },
      }, '/abc');
      const res = await findPackageProject('/abc');
      expect(res.length).toBe(1);
      expect(res[0]).toBe('/abc/b');
    });

    it('传入 exclude，忽略 b 路径', async () => {
      vol.fromNestedJSON({
        a: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
        },
        bb: {
          'package.json': 'ok',
        },
        b: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
        },
      }, '/abc');
      const res = await findPackageProject('/abc', '**/b');
      expect(res).toMatchObject([
        '/abc/a/d', '/abc/a', '/abc/b/d', '/abc/bb',
      ]);
    });
    it('传入 exclude，*/b,**/a/**', async () => {
      vol.fromNestedJSON({
        a: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
        },
        bb: {
          'package.json': 'ok',
        },
        b: {
          'package.json': 'ok',
          abc: '',
          d: {
            'package.json': 'ok',
          },
          b: {
            'package.json': 'ok',
          },
        },
      }, '/abc');
      const res = await findPackageProject('/abc', '**/b,**/a,**/a/**');
      expect(res).toMatchObject([
        '/abc/b/d', '/abc/bb',
      ]);
    });
  });

  describe('getPackagesConfig', () => {
    beforeAll(() => {
      vol.reset();
    });
    afterAll(() => {
      vol.reset();
    });

    it('解析目标路径的 package.json 文件，使用 ncu 检查每个 package.json 的版本是否最新，生成一个差异化的包信息', async () => {
      vol.fromNestedJSON({
        p1: {
          'package.json': JSON.stringify(p1),
        },
        p2: {
          'package.json': JSON.stringify(p2),
        },
      }, '/abc');
      const res = await getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      expect(res.length).toBe(2);
      expect(res[0]).toMatchObject({
        cwd: '/abc/p1',
        packageJson: p1,
        packages: [
          {
            name: 'a2',
            oldVersion: '~2.2.0',
            newVersion: '2.3.3',
            isUpdate: true,
            updateType: 'minor',
            isDevDependencies: false,
          },
          {
            name: 'a3',
            oldVersion: '1.2.0',
            newVersion: '2.4.0',
            isUpdate: true,
            updateType: 'major',
            isDevDependencies: true,
          },
        ],
      });
      expect(res[1]).toMatchObject({
        cwd: '/abc/p2',
        packageJson: p2,
        packages: [
          {
            name: 'a1',
            oldVersion: '2.0.0',
            newVersion: '2.1.0',
            isUpdate: true,
            updateType: 'minor',
            isDevDependencies: false,
          },
          {
            name: 'a2',
            oldVersion: '~2.3.0',
            newVersion: '2.3.3',
            isUpdate: true,
            updateType: 'patch',
            isDevDependencies: false,
          },
          {
            name: 'a3',
            oldVersion: '1.2.0',
            newVersion: '2.4.0',
            isUpdate: true,
            updateType: 'major',
            isDevDependencies: true,
          },
        ],
      });
    });

    it('解析目标路径的 package.json 文件，dependencies 和 devDependencies 都为空，返回空', async () => {
      vol.fromNestedJSON({
        p1: {
          'package.json': JSON.stringify(omit(p1, ['dependencies', 'devDependencies'])),
        },
        p2: {
          'package.json': JSON.stringify(omit(p2, ['dependencies', 'devDependencies'])),
        },
      }, '/abc');
      const res = await getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      expect(res.length).toBe(2);
      expect(res[0]).toMatchObject({
        cwd: '/abc/p1',
        packageJson: omit(p1, ['dependencies', 'devDependencies']),
        packages: [],
      });
      expect(res[1]).toMatchObject({
        cwd: '/abc/p2',
        packageJson: omit(p2, ['dependencies', 'devDependencies']),
        packages: [],
      });
    });

    it('解析目标路径的 package.json 文件，找不到对应的 package.json 文件，返回 [false]', async () => {
      const res = await getPackagesConfig(['/abc/p3']);
      expect(res.length).toBe(1);
      expect(res[0]).toBe(false);
    });
  });

  describe('getConfirmPrompt', () => {
    beforeAll(() => {
      vol.reset();
    });
    afterAll(() => {
      vol.reset();
    });
    it('显示每个包的更新信息', async () => {
      vol.fromNestedJSON({
        p1: {
          'package.json': JSON.stringify(p1),
        },
        p2: {
          'package.json': JSON.stringify(p2),
        },
      }, '/abc');
      const list = await getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      const prompt = getConfirmPrompt(list as ProjectConfigType[]);
      expect(prompt.state.message).toBe(`
将会更新以下依赖：

更新项目：/abc/p1
  a2@~2.2.0 -> 2.3.3；
  a3@1.2.0 -> 2.4.0；dev

更新项目：/abc/p2
  a1@2.0.0 -> 2.1.0；
  a2@~2.3.0 -> 2.3.3；
  a3@1.2.0 -> 2.4.0；dev

是否确定？`);
    });
  });

  describe('updateProjectDependencies', () => {
    beforeAll(() => {
      vol.reset();
    });
    afterAll(() => {
      vol.reset();
    });

    it('传入包数组，根据包的信息，修改本地 package.json 的数据', async () => {
      vol.fromNestedJSON({
        p1: {
          'package.json': JSON.stringify(p1),
        },
        p2: {
          'package.json': JSON.stringify(p2),
        },
      }, '/abc');
      const list = await getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      updateProjectDependencies(list as ProjectConfigType[]);
      const p1Data = JSON.parse(vol.readFileSync('/abc/p1/package.json', { encoding: 'utf-8' }) as string);
      expect(p1Data.dependencies.a1).toBe(maxVersion.a1);
      expect(p1Data.dependencies.a2).toBe(maxVersion.a2);
      expect(p1Data.devDependencies.a3).toBe(maxVersion.a3);
      const p2Data = JSON.parse(vol.readFileSync('/abc/p2/package.json', { encoding: 'utf-8' }) as string);
      expect(p2Data.dependencies.a1).toBe(maxVersion.a1);
      expect(p2Data.dependencies.a2).toBe(maxVersion.a2);
      expect(p2Data.devDependencies.a3).toBe(maxVersion.a3);
    });
  });

  describe('', () => {
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
    describe('commonGetChoices', () => {
      it('获取 enquirer MultiSelect 的选项', async () => {
        const list = (await getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
        const res = commonGetChoices(list);
        expect(res).toMatchObject([
          {
            name: '/abc/p1',
            cwd: '/abc/p1',
          },
          {
            name: '/abc/p2',
            cwd: '/abc/p2',
          },
        ]);
      });
    });

    describe('commonChangeChoicesToProjectConfig', () => {
      it('将 MultiSelect 选项值转为包信息', async () => {
        const list = (await getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
        const res = commonChangeChoicesToProjectConfig(
          ['/abc/p1', '/abc/p2'],
          list,
        );
        expect(res).toMatchObject(list);
      });
    });

    describe('getMultiSelectPrompt', () => {
      it('将 MultiSelect 选项值转为包信息', async () => {
        const list = (await getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
        const prompt = getMultiSelectPrompt(
          list,
          {
            opts: { show: false, message: '选择要更新对应依赖的项目' },
          },
        );
        expect(prompt.options.message).toBe('选择要更新对应依赖的项目');
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
        const list = (await getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
        const prompt = getMultiSelectPrompt(
          list,
          {
            opts: { show: false },
          },
        );
        prompt.on('run', async () => {
          await prompt.submit();
        });
        prompt.run()
          .then((res) => {
            expect(res).toMatchObject([]);
          });
      });
    });
  });
});
