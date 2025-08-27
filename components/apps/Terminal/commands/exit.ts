import type { Command } from '..';

const exitCmd: Command = {
  name: 'exit',
  help: 'Close current pane',
  run: (_argv, term) => {
    term.term.writeln('');
    term.writeLine('Closed pane');
    term.exit();
    term.prompt();
  },
};

export default exitCmd;

