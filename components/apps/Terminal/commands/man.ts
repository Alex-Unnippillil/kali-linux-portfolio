import type { Command } from '..';

const man: Command = {
  name: 'man',
  help: 'Show command usage',
  run: (argv, term) => {
    term.term.writeln('');
    if (argv.length === 0) {
      term.writeLine('Usage: man <command>');
    } else {
      const name = argv.join(' ');
      const cmd = term.registry[name];
      if (cmd) {
        term.writeLine(`${name} - ${cmd.help}`);
      } else {
        term.writeLine(`No manual entry for ${name}`);
      }
    }
    term.prompt();
  },
};

export default man;

