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

const ls: CommandHandler = (_args, ctx) => {
  const entries = Object.keys(ctx.files);
  ctx.writeLine(entries.length ? entries.join('  ') : '');
};

const cat: CommandHandler = async (args, ctx) => {
  const target = args.trim();
  if (!target) {
    ctx.writeLine('Usage: cat <file>');
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
  ctx.writeLine('This terminal uses a lightweight in-browser prompt.');
};

const date: CommandHandler = (_args, ctx) => {
  ctx.writeLine(new Date().toString());
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
  { name: 'grep', description: 'Search through text (simulated).', usage: 'grep <pattern> [file]', handler: (args, ctx) => ctx.runWorker(`grep ${args}`) },
  { name: 'jq', description: 'Filter JSON input (simulated).', usage: 'jq <path> [file]', handler: (args, ctx) => ctx.runWorker(`jq ${args}`) },
];

const registry: Record<string, CommandDefinition> = Object.fromEntries(
  commandList.map((def) => [def.name, def]),
);

export const getCommandList = () => commandList;

export default registry;
export type { CommandDefinition, CommandHandler, CommandContext } from './types';
