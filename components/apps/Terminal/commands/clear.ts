import type { Command } from '..';

const clear: Command = {
  name: 'clear',
  help: 'Clear the terminal',
  run: (_argv, term) => {
    term.clear();
    term.prompt();
  },
};

export default clear;

