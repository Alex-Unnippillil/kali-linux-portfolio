import type { CommandContext, CommandDefinition, CommandHandler } from './types';

async function man(args: string, ctx: CommandContext) {
  const name = args.trim();
  if (!name) {
    ctx.writeLine('usage: man <command>');
    return;
  }
  const loaders: Record<string, () => Promise<string>> = {
    alias: () => fetch(new URL('../man/alias.txt', import.meta.url)).then((r) => r.text()),
    cat: () => fetch(new URL('../man/cat.txt', import.meta.url)).then((r) => r.text()),
    grep: () => fetch(new URL('../man/grep.txt', import.meta.url)).then((r) => r.text()),
    history: () => fetch(new URL('../man/history.txt', import.meta.url)).then((r) => r.text()),
    jq: () => fetch(new URL('../man/jq.txt', import.meta.url)).then((r) => r.text()),
    man: () => fetch(new URL('../man/man.txt', import.meta.url)).then((r) => r.text()),
  };
  const loader = loaders[name];
  if (loader) ctx.writeLine(await loader());
  else ctx.writeLine(`No manual entry for ${name}`);
}

function history(_args: string, ctx: CommandContext) {
  ctx.history.forEach((cmd, i) => ctx.writeLine(`${i + 1}  ${cmd}`));
}

function alias(args: string, ctx: CommandContext) {
  if (!args) {
    Object.entries(ctx.aliases).forEach(([k, v]) => ctx.writeLine(`${k}='${v}'`));
    return;
  }
  const [name, value] = args.split('=');
  if (value) {
    ctx.setAlias(name.trim(), value.trim());
  } else {
    const existing = ctx.aliases[name.trim()];
    if (existing) ctx.writeLine(`${name}='${existing}'`);
  }
}

const help: CommandHandler = (args, ctx) => {
  const termWidth = 80;
  const commands = ctx.listCommands();
  const query = args.trim();
  if (query) {
    const cmd = commands.find((c) => c.name === query);
    if (cmd) {
      ctx.writeLine(`${cmd.name} - ${cmd.description}`);
      if (cmd.usage) ctx.writeLine(`usage: ${cmd.usage}`);
    } else {
      ctx.writeLine(`Unknown command: ${query}`);
    }
    return;
  }

  ctx.writeLine('Available commands (type "help <command>" for details):');
  for (const { name, description } of commands) {
    const padded = `${name}${' '.repeat(Math.max(2, 16 - name.length))}`;
    const line = `${padded}${description}`;
    ctx.writeLine(line.slice(0, termWidth));
  }
  ctx.writeLine(
    'Example scripts: https://github.com/unnippillil/kali-linux-portfolio/tree/main/scripts/examples',
  );
};

const ls: CommandHandler = (args, ctx) => {
  const target = args.trim() || ctx.cwd;
  const resolved = ctx.vfs.resolvePath(target, ctx.cwd);
  const entries = ctx.vfs.listDirectory(resolved);
  if (!entries.length) {
    ctx.writeLine('');
    return;
  }
  const names = entries.map((entry) => entry.name);
  ctx.writeLine(names.join('  '));
};

const cat: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('Usage: cat <file>');
    return;
  }
  const resolved = ctx.vfs.resolvePath(target, ctx.cwd);
  const vfsRead = ctx.vfs.readFile(resolved);
  if (vfsRead.ok) {
    ctx.writeLine(vfsRead.content || '');
    return;
  }
  if (target in ctx.files) {
    ctx.writeLine(ctx.files[target]);
    return;
  }
  await ctx.runWorker(`cat ${args}`);
};

const clear: CommandHandler = (_args, ctx) => {
  ctx.clear();
};

const open: CommandHandler = (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('Usage: open <app>');
    return;
  }
  if (ctx.openApp) {
    ctx.openApp(target);
    ctx.writeLine(`Opening ${target}`);
  } else {
    ctx.writeLine('Open command unavailable');
  }
};

const about: CommandHandler = (_args, ctx) => {
  ctx.writeLine('This terminal is powered by xterm.js');
};

const date: CommandHandler = (_args, ctx) => {
  ctx.writeLine(new Date().toString());
};

const pwd: CommandHandler = (_args, ctx) => {
  ctx.writeLine(ctx.cwd);
};

const cd: CommandHandler = (args, ctx) => {
  const target = args.trim() || '~';
  const resolved = ctx.vfs.resolvePath(target, ctx.cwd);
  const entry = ctx.vfs.getEntry(resolved);
  if (!entry) {
    ctx.writeLine(`cd: ${target}: No such file or directory`);
    return;
  }
  if (entry.type !== 'directory') {
    ctx.writeLine(`cd: ${target}: Not a directory`);
    return;
  }
  ctx.setCwd(resolved);
};

const mkdir: CommandHandler = (args, ctx) => {
  if (!args.trim()) {
    ctx.writeLine('Usage: mkdir [-p] <dir>');
    return;
  }
  const parts = args.split(' ').map((part) => part.trim()).filter(Boolean);
  const recursive = parts.includes('-p');
  const targets = parts.filter((part) => part !== '-p');
  if (!targets.length) {
    ctx.writeLine('mkdir: missing operand');
    return;
  }
  targets.forEach((target) => {
    const result = ctx.vfs.createDirectory(target, { cwd: ctx.cwd, recursive });
    if (!result.ok) {
      ctx.writeLine(`mkdir: ${target}: ${result.message || 'unable to create directory'}`);
    }
  });
};

const touch: CommandHandler = (args, ctx) => {
  if (!args.trim()) {
    ctx.writeLine('Usage: touch <file>');
    return;
  }
  const targets = args.split(' ').map((part) => part.trim()).filter(Boolean);
  targets.forEach((target) => {
    const result = ctx.vfs.createFile(target, '', { cwd: ctx.cwd });
    if (!result.ok) {
      ctx.writeLine(`touch: ${target}: ${result.message || 'unable to create file'}`);
    }
  });
};

const rm: CommandHandler = (args, ctx) => {
  if (!args.trim()) {
    ctx.writeLine('Usage: rm [-r] <path>');
    return;
  }
  const parts = args.split(' ').map((part) => part.trim()).filter(Boolean);
  const recursive = parts.includes('-r') || parts.includes('-rf') || parts.includes('-fr');
  const targets = parts.filter((part) => !part.startsWith('-'));
  if (!targets.length) {
    ctx.writeLine('rm: missing operand');
    return;
  }
  targets.forEach((target) => {
    const result = ctx.vfs.removePath(target, { cwd: ctx.cwd, recursive });
    if (!result.ok) {
      ctx.writeLine(`rm: ${target}: ${result.message || 'unable to remove path'}`);
    }
  });
};

const commandList: CommandDefinition[] = [
  { name: 'help', description: 'Show this index or details for a single command.', usage: 'help [command]', handler: help },
  { name: 'man', description: 'Read the simulated manual pages.', usage: 'man <command>', handler: man },
  { name: 'history', description: 'Print command history for this session.', handler: history },
  { name: 'alias', description: 'Create or list aliases.', usage: "alias [name]='value'", handler: alias },
  { name: 'ls', description: 'List available demo files.', handler: ls },
  { name: 'cat', description: 'Print a file or pipe stdin.', usage: 'cat <file>', handler: cat },
  { name: 'clear', description: 'Clear the terminal buffer.', handler: clear },
  { name: 'open', description: 'Open another desktop app.', usage: 'open <app-id>', handler: open },
  { name: 'about', description: 'Show information about this terminal.', handler: about },
  { name: 'date', description: 'Print the current date.', handler: date },
  { name: 'pwd', description: 'Print the working directory.', handler: pwd },
  { name: 'cd', description: 'Change the working directory.', usage: 'cd [path]', handler: cd },
  { name: 'mkdir', description: 'Create a directory.', usage: 'mkdir [-p] <dir>', handler: mkdir },
  { name: 'touch', description: 'Create a file.', usage: 'touch <file>', handler: touch },
  { name: 'rm', description: 'Remove a file or directory.', usage: 'rm [-r] <path>', handler: rm },
  { name: 'grep', description: 'Search through text (simulated).', usage: 'grep <pattern> [file]', handler: (args, ctx) => ctx.runWorker(`grep ${args}`) },
  { name: 'jq', description: 'Filter JSON input (simulated).', usage: 'jq <path> [file]', handler: (args, ctx) => ctx.runWorker(`jq ${args}`) },
];

const registry: Record<string, CommandDefinition> = Object.fromEntries(
  commandList.map((def) => [def.name, def]),
);

export const getCommandList = () => commandList;

export default registry;
export type { CommandDefinition, CommandHandler, CommandContext } from './types';
