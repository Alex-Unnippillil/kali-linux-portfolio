import type { Command } from '..';

const pwd: Command = {
  name: 'pwd',
  help: 'Print current directory',
  run: (_argv, term) => {
    term.term.writeln('');
    term.writeLine('/home/alex');
    term.prompt();
  },
};

export default pwd;

