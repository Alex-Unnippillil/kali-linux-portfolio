import type { CommandHandler, CommandContext } from './types';

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

const help: CommandHandler = (_args, ctx) => {
  const commands = ctx.listCommands();
  ctx.writeLine(`Available commands: ${commands.join(', ')}`);
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
  ctx.writeLine('This terminal is powered by xterm.js');
};

const date: CommandHandler = (_args, ctx) => {
  ctx.writeLine(new Date().toString());
};

const registry: Record<string, CommandHandler> = {
  man,
  history,
  alias,
  help,
  ls,
  cat,
  clear,
  open,
  about,
  date,
  grep: (args, ctx) => ctx.runWorker(`grep ${args}`),
  jq: (args, ctx) => ctx.runWorker(`jq ${args}`),
};

export default registry;
export type { CommandHandler, CommandContext } from './types';
