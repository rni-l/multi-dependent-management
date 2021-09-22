import { vol } from 'memfs';
import { ProjectConfigType } from '../lib/types';
import {
  getPackagesConfig,
} from '../lib/utils';
import { getChoices, changeChoicesToProjectConfig } from '../lib/upgrade';
import { p1, p2 } from './mockData/packageJsonData';

jest.mock('fs');
jest.mock('npm-check-updates');
jest.mock('enquirer');

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
      const list = await getPackagesConfig(['/abc/p1', '/abc/p2']);
      const res = getChoices(list as ProjectConfigType[]);
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
      const list = await getPackagesConfig(['/abc/p1', '/abc/p2']);
      const res = changeChoicesToProjectConfig(['/abc/p2 - a3 - 1.2.0 -> 2.4.0'], list as ProjectConfigType[]);
      expect(res).toMatchObject([
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
      ]);
    });
  });
});
