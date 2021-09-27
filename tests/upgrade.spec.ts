import { vol } from 'memfs';
import { ProjectConfigType } from '../lib/types';
import * as utils from '../lib/utils';
import * as upgradeUtils from '../lib/upgrade';
import { p1, p2, maxVersion } from './mockData/packageJsonData';

jest.mock('fs');
jest.mock('npm-check-updates');
jest.mock('ora');

describe('test lib/upgrade', () => {
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
  describe('getChoices', () => {
    it('将包信息转为 enquirer 需要的数据结构', async () => {
      const list = await utils.getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      const res = upgradeUtils.getChoices(list as ProjectConfigType[]);
      expect(res).toMatchObject([
        {
          name: '/abc/p1 - a2 - ~2.2.0 -> 2.3.3',
          projectCdw: '/abc/p1',
          updateName: 'a2',
        },
        {
          name: '/abc/p1 - a3 - 1.2.0 -> 2.4.0',
          projectCdw: '/abc/p1',
          updateName: 'a3',
        },
        {
          name: '/abc/p2 - a1 - 2.0.0 -> 2.1.0',
          projectCdw: '/abc/p2',
          updateName: 'a1',
        },
        {
          name: '/abc/p2 - a2 - ~2.3.0 -> 2.3.3',
          projectCdw: '/abc/p2',
          updateName: 'a2',
        },
        {
          name: '/abc/p2 - a3 - 1.2.0 -> 2.4.0',
          projectCdw: '/abc/p2',
          updateName: 'a3',
        },
      ]);
    });
  });

  describe('changeChoicesToProjectConfig', () => {
    it('将 enquirer 选中的值，转成 projectConfig 类型', async () => {
      const list = await utils.getPackagesConfig(['/abc/p1', '/abc/p2'], true);
      const res = upgradeUtils.changeChoicesToProjectConfig(['/abc/p2 - a2 - ~2.3.0 -> 2.3.3', '/abc/p2 - a3 - 1.2.0 -> 2.4.0'], list as ProjectConfigType[]);
      expect(res).toMatchObject([
        {
          cwd: '/abc/p2',
          packageJson: p2,
          packages: [
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
        },
      ]);
    });
  });

  describe('upgrade', () => {
    afterEach(() => {
      jest.resetModules();
    });
    it('确认更新所有的依赖', async () => {
      jest.spyOn(utils, 'getMultiSelectPrompt').mockImplementation(() => ({
        run: () => Promise.resolve([
          {
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
            ],
          },
          {
            cwd: '/abc/p2',
            packageJson: p2,
            packages: [
              {
                name: 'a3',
                oldVersion: '1.2.0',
                newVersion: '2.4.0',
                isUpdate: true,
                updateType: 'major',
                isDevDependencies: true,
              },
            ],
          },
        ]),
      }));
      jest.spyOn(utils, 'getConfirmPrompt').mockImplementation(() => ({
        run: () => Promise.resolve(true),
      }));
      await upgradeUtils.upgrade(utils.findPackageProject('/abc'));
      const p1Data = JSON.parse(vol.readFileSync('/abc/p1/package.json', { encoding: 'utf-8' }) as string);
      expect(p1Data.dependencies.a2).toBe(maxVersion.a2);
      const p2Data = JSON.parse(vol.readFileSync('/abc/p2/package.json', { encoding: 'utf-8' }) as string);
      expect(p2Data.devDependencies.a3).toBe(maxVersion.a3);
    });
  });
});
