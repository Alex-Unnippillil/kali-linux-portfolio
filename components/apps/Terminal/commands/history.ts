import type { Command } from '..';

const history: Command = {
  name: 'history',
  help: 'Show command history',
  run: (_argv, term) => {
    term.term.writeln('');
    const historyText = term.history.join('\n');
    term.writeLine(historyText);
    term.prompt();
  },
};

export default history;

