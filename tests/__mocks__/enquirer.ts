import { ProjectConfigType } from '../../lib/types';
import { changeChoicesToProjectConfig } from '../../lib/upgrade';

const Confirm = jest.fn().mockImplementationOnce((opts: any) => ({
  run: async () => jest.fn(),
  getMsg: () => opts.message,
}));

const MultiSelect = jest.fn().mockImplementationOnce((opts: any) => {
  let returnIndexes: number[] = [];
  let list: ProjectConfigType[] = [];
  return {
    run: async () => {
      const names = (opts.choices as any[]).filter((v, i) => returnIndexes.includes(i)).map((v) => v.name);
      return changeChoicesToProjectConfig(names, list);
    },
    setReturnIndex: (num: number[]) => {
      returnIndexes = num;
    },
    setList: (arr: ProjectConfigType[]) => {
      list = arr;
    },
  };
});

export {
  Confirm,
  MultiSelect,
};
