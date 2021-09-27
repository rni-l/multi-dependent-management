import { vol } from 'memfs';
import * as diffUtils from '../lib/diff';
import { p1, p2, maxVersion } from './mockData/packageJsonData';
import * as utils from '../lib/utils';
import { ProjectConfigType } from '../lib/types';

const mockCache: string[] = [];

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

describe('test lib/diff.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('getConfirm', () => {
    it('选择确认，返回 false', async () => {
      const prompt = await diffUtils.getConfirm({ show: false });
      prompt.on('run', async () => {
        await prompt.submit();
      });
      const res = await prompt.run();
      expect(res).toBe(false);
    });
  });

  describe('getMaxVersionObj', () => {
    it('传入包，分析里面的依赖情况，一个对象，包含每个依赖的最高版本', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const obj = diffUtils.getMaxVersionObj(list);
      expect(obj).toMatchObject({
        a1: '2.1.0',
        a2: '~2.3.0',
        a3: '1.2.0',
      });
    });
  });

  describe('log', () => {
    it('根据包和依赖最高版本信息，返回对应可以升级的依赖数组', async () => {
      const list = (await utils.getPackagesConfig(['/abc/p1', '/abc/p2'])) as ProjectConfigType[];
      const maxVersionObj = diffUtils.getMaxVersionObj(list);
      const packages1 = diffUtils.log('dependencies', list[0], maxVersionObj);
      const packages2 = diffUtils.log('devDependencies', list[1], maxVersionObj);
      expect(packages1).toMatchObject([
        {
          name: 'a2',
          oldVersion: '~2.2.0',
          newVersion: '~2.3.0',
          isUpdate: true,
          updateType: '',
          isDevDependencies: false,
        },
      ]);
      expect(packages2).toMatchObject([]);
    });
  });

  describe('diff', () => {
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
    });
    it('不选择更新，执行返回 false', async () => {
      jest.spyOn(diffUtils, 'getConfirm').mockImplementation(() => ({
        run: () => Promise.resolve(false),
      }));
      const res = await diffUtils.diff(['/abc/p1', '/abc/p2']);
      expect(res).toBe(false);
    });

    it('选择更新，文件版本进行更新', async () => {
      jest.spyOn(diffUtils, 'getConfirm').mockImplementation(() => ({
        run: () => Promise.resolve(true),
      }));
      const res = await diffUtils.diff(['/abc/p1', '/abc/p2']);
      expect(res).toBe(true);
      const p1Data = JSON.parse(vol.readFileSync('/abc/p1/package.json', { encoding: 'utf-8' }) as string);
      expect(p1Data.dependencies.a1).toBe(maxVersion.a1);
      expect(p1Data.dependencies.a2).toBe('~2.3.0');
      expect(p1Data.devDependencies.a3).toBe('1.2.0');
      const p2Data = JSON.parse(vol.readFileSync('/abc/p2/package.json', { encoding: 'utf-8' }) as string);
      expect(p2Data.dependencies.a1).toBe(maxVersion.a1);
      expect(p2Data.dependencies.a2).toBe('~2.3.0');
      expect(p2Data.devDependencies.a3).toBe('1.2.0');
    });
  });
});
