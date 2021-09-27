// const argv = require('minimist')(process.argv.slice(2));

// console.log(argv);
const minimatch = require('minimatch');
const { Command } = require('commander');

const program = new Command();
// program
//   .version('0.0.1')
//   .option('-c, --config <path>', 'set config path', './deploy.conf');

// program
//   .command('setup [env]')
//   .description('run setup commands for all envs')
//   .option('-s, --setup_mode <mode>', 'Which setup mode to use', 'normal')
//   .action((env, options) => {
//     env = env || 'all';
//     console.log('read config from %s', program.opts().config);
//     console.log('setup for %s env(s) with %s mode', env, options.setup_mode);
//   });

// program
//   .command('exec <script>')
//   .alias('ex')
//   .description('execute the given remote cmd')
//   .option('-e, --exec_mode <mode>', 'Which exec mode to use', 'fast')
//   .action((script, options) => {
//     console.log('read config from %s', program.opts().config);
//     console.log('exec "%s" using %s mode and config %s', script, options.exec_mode, program.opts().config);
//   })
//   .addHelpText('after', `
// Examples:
//   $ deploy exec sequential
//   $ deploy exec async`);
// program.command('upgrade')
//   .description('用于升级项目的依赖')
//   .option('-p, --path <mode>', '要递归处理的路径')
//   .action((env, options) => {
//     console.log(env.path);
//   });
// program.parse(process.argv);

console.log(minimatch('/abc/b', '**/b'));
console.log(minimatch('/abc/b/c', '**/b'));
console.log(minimatch('/abc/b/a', '**/b'));
console.log(minimatch('/b', '**/b'));
console.log(minimatch('/a/c/b/b', '**/b'));
console.log(minimatch('/a/c/b/b', '**/b/**'));
