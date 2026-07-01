const files = {
  'about.txt': 'This portfolio terminal emulates basic shell commands.',
};

const commands = {
  help: (ctx) => {
    const cmds = Object.keys(commands).sort().join(' ');
    ctx.write(`Available commands: ${cmds}`);
  },
  ls: (ctx) => {
    ctx.write(Object.keys(files).join(' '));
  },
  cat: (ctx, args = []) => {
    if (args.length === 0) {
      ctx.write('Usage: cat <file>');
      return;
    }
    const file = args[0];
    if (files[file]) {
      ctx.write(files[file]);
    } else {
      ctx.write(`cat: ${file}: No such file`);
    }
  },
  clear: (ctx) => {
    ctx.clear();
  },
  open: (ctx, args = []) => {
    if (args.length === 0) {
      ctx.write('Usage: open <app>');
      return;
    }
    ctx.openApp(args[0]);
    ctx.write(`Opening ${args[0]}...`);
  },
  about: (ctx) => {
    ctx.write('Kali Linux portfolio terminal.');
  },
  date: (ctx) => {
    ctx.write(new Date().toString());
  },
};

export default commands;
