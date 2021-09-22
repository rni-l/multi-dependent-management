import { RunOptions } from 'npm-check-updates';
import { p1, p2, maxVersion } from '../mockData/packageJsonData';

const mockNcu = {
  run: async (opts: RunOptions): Promise<any> => new Promise((resolver) => {
    resolver({
      name: opts.packageFile?.indexOf('p1') ? p1.name : p2.name,
      dependencies: {
        a1: maxVersion.a1,
        a2: maxVersion.a2,
      },
      devDependencies: {
        a3: maxVersion.a3,
      },
    });
  }),
};

export default mockNcu;
