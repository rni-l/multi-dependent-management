export type ProjectPackageType = {
  name: string;
  oldVersion: string;
  newVersion: string;
  isUpdate: boolean;
  updateType: 'patch' | 'minor' | 'major' | 'premajor' | 'preminor' | 'prepatch' | '';
  isDevDependencies: boolean;
}

export type ObjectKey<T> = {
  [key: string]: T;
}

export type ProjectConfigType = {
  cwd: string;
  packageJson: {
    [key: string]: any;
    name: string;
    version: string;
    dependencies?: ObjectKey<string>;
    devDependencies?: ObjectKey<string>;
  };
  packages: ProjectPackageType[]
}
