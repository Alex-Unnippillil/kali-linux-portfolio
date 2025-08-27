import type { Command } from '..';

const help: Command = {
  name: 'help',
  help: 'List available commands',
  run: (_argv, term) => {
    term.term.writeln('');
    const cmds = Object.keys(term.registry).sort();
    term.writeLine('Available commands:');
    cmds.forEach((name) => {
      const cmd = term.registry[name];
      term.writeLine(`${name} - ${cmd.help}`);
    });
    term.prompt();
  },
};

export default help;

