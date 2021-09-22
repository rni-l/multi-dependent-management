import program from './commander';
import upgrade from './upgrade';

program.command('upgrade')
  .description('用于升级项目的依赖')
  .option('-p, --path <mode>', '要递归处理的路径')
  .action((env) => {
    if (!env.path) {
      console.log('请输入要处理的路径');
    } else {
      upgrade(env.path);
    }
  });

program.parse(process.argv);
