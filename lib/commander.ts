import { Command } from 'commander';
import packageJson from '../package.json';

const program = new Command();

program.version(packageJson.version)
  .description('用于管理多项目 package.json 的依赖');

export default program;
