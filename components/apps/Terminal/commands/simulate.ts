import type { Command } from '..';

const simulate: Command = {
  name: 'simulate',
  help: 'Run heavy simulation',
  run: (_argv, term) => {
    term.term.writeln('');
    if (term.worker) {
      term.writeLine('Running heavy simulation...');
      term.worker.postMessage({ command: 'simulate' });
    } else {
      const msg = 'Web Workers are not supported in this environment.';
      term.writeLine(msg);
      term.prompt();
    }
  },
};

export default simulate;

