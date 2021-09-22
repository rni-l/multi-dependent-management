export const maxVersion = {
  a1: '2.1.0',
  a2: '2.3.3',
  a3: '2.4.0',
};

export const p1 = {
  name: 'p1',
  dependencies: {
    a1: maxVersion.a1,
    a2: '~2.2.0',
  },
  devDependencies: {
    a3: '1.2.0',
  },
};

export const p2 = {
  name: 'p2',
  dependencies: {
    a1: '2.0.0',
    a2: '~2.3.0',
  },
  devDependencies: {
    a3: '1.2.0',
  },
};
