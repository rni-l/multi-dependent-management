import { vol } from 'memfs';
import * as updateSpecifyUtils from '../lib/updateSpecify';
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

describe('test lib/updateSpecify.ts', () => {
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

  describe('getUpdatePackages', () => {
    it('生成依赖数组', async () => {
      const res = await updateSpecifyUtils.getUpdatePackages({
        dependencies: 'a1', devDependencies: 'a2',
      });
      expect(res).toMatchObject({
        dependencies: ['a1'], devDependencies: ['a2'],
      });
    });
    it('输入多个依赖字符串，用逗号隔开，并移除空格', async () => {
      const res = await updateSpecifyUtils.getUpdatePackages({
        dependencies: 'a1 , a3, a4 ', devDependencies: 'a2, a5 ',
      });
      expect(res).toMatchObject({
        dependencies: ['a1', 'a3', 'a4'], devDependencies: ['a2', 'a5'],
      });
    });
  });

  describe('updateProjectDependencies', () => {
    // beforeAll(() => {
    // });
    afterAll(() => {
      jest.restoreAllMocks();
      mockCache = [];
    });
    it('根据要移除的依赖信息，修改对应项目的 package.json', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      updateSpecifyUtils.updateProjectDependencies(list, ['a4', 'a5'], ['a6'], false);
      expect(mockCache).toMatchObject([
        '/abc/p1',
        'npm i a4 a5 -S --package-lock-only',
        'npm i a6 -D --package-lock-only',
        '/abc/p2',
        'npm i a4 a5 -S --package-lock-only',
        'npm i a6 -D --package-lock-only',
      ]);
    });
  });

  describe('updateSpecify', () => {
    afterEach(() => {
      jest.resetModules();
    });
    it('更新对应依赖', async () => {
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
      jest.spyOn(updateSpecifyUtils, 'getUpdatePackageTxt').mockImplementationOnce(() => (Promise.resolve({
        update: {
          dependencies: 'a4, a5 ',
          devDependencies: ' a6 ',
        },
        install: '否',
      })));
      await updateSpecifyUtils.updateSpecify(utils.findPackageProject('/abc'));
      expect(mockCache).toMatchObject([
        '/abc/p1',
        'npm i a4 a5 -S --package-lock-only',
        'npm i a6 -D --package-lock-only',
        '/abc/p2',
        'npm i a4 a5 -S --package-lock-only',
        'npm i a6 -D --package-lock-only',
      ]);
    });
  });

  describe('getUpdatePackagePrompt', () => {
    it('测试内容输入', async () => {
      const { formPrompt } = await updateSpecifyUtils.getUpdatePackagePrompt({ show: false });
      formPrompt.on('run', async () => {
        await formPrompt.keypress('lodash');
        await formPrompt.keypress(null, { name: 'down' });
        await formPrompt.keypress('jquery');
        await formPrompt.submit();
      });
      formPrompt.run().then((res) => [
        expect(res).toMatchObject({
          dependencies: 'lodash',
          devDependencies: 'jquery',
        }),
      ]);
    });
    it('测试内容选择', async () => {
      const { selectPrompt } = await updateSpecifyUtils.getUpdatePackagePrompt({ show: false });
      selectPrompt.on('run', async () => {
        await selectPrompt.keypress(null, { name: 'down' });
        await selectPrompt.submit();
      });
      selectPrompt.run().then((res) => [
        expect(res).toBe('否'),
      ]);
    });
  });

  describe('getUpdatePackageTxt', () => {
    it('将 getUpdatePackagePrompt 获取的数据，进行组装返回', async () => {
      jest.spyOn(updateSpecifyUtils, 'getUpdatePackagePrompt').mockImplementation(() => ({
        formPrompt: {
          run: () => Promise.resolve({
            dependencies: '0',
            devDependencies: '1',
          }),
        },
        selectPrompt: {
          run: () => Promise.resolve('是'),
        },
      }));
      const res = await updateSpecifyUtils.getUpdatePackageTxt();
      expect(res).toMatchObject({
        update: {
          dependencies: '0',
          devDependencies: '1',
        },
        install: '是',
      });
    });
  });
});
