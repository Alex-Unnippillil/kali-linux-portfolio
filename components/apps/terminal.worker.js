// Simple worker that simulates a few built-in shell commands. It does not
// execute arbitrary code and only responds to a whitelisted set of commands.
self.onmessage = (e) => {
  const { command = '' } = e.data || {};
  const [cmd, ...args] = command.trim().split(/\s+/);

  switch (cmd) {
    case 'simulate': {
      // Fake heavy computation to demonstrate worker usage
      let total = 0;
      for (let i = 0; i < 5e7; i += 1) {
        total += i; // eslint-disable-line no-unused-vars
      }
      self.postMessage('Simulation complete');
      break;
    }
    case 'date': {
      self.postMessage(new Date().toString());
      break;
    }
    case 'echo': {
      self.postMessage(args.join(' '));
      break;
    }
    case 'ls': {
      // Return a fixed set of filenames to avoid exposing the real file system
      self.postMessage('Documents Downloads Music Pictures Videos');
      break;
    }
    default: {
      self.postMessage(`Command '${cmd}' not found`);
    }
  }
};
