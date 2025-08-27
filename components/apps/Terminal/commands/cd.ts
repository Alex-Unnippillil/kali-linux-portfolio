import type { Command } from '..';

const cd: Command = {
  name: 'cd',
  help: 'Change directory (mock)',
  run: (argv, term) => {
    const target = argv[0] || '';
    term.term.writeln('');
    term.writeLine(`bash: cd: ${target}: No such file or directory`);
    term.prompt();
  },
};

export default cd;

