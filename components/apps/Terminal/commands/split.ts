import type { Command } from '..';

const split: Command = {
  name: 'split',
  help: 'Open new pane',
  run: (_argv, term) => {
    term.term.writeln('');
    term.writeLine('Opened new pane');
    term.split();
    term.prompt();
  },
};

export default split;

