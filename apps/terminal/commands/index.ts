import type { CommandHandler, CommandContext } from './types';
import { getExtraRepos } from '../../../utils/settingsStore';

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

async function apt(args: string, ctx: CommandContext) {
  const sub = args.trim();
  if (sub === 'update') {
    ctx.writeLine('Hit:1 https://http.kali.org/kali kali-rolling InRelease');
    const extra = await getExtraRepos();
    if (extra) {
      ctx.writeLine(
        'WARNING: Extra repositories are enabled. Manage them in the APT sources panel: /apps/apt-sources',
      );
    }
    ctx.writeLine('Reading package lists... Done');
  } else {
    ctx.writeLine('usage: apt update');
  }
}

const registry: Record<string, CommandHandler> = {
  man,
  history,
  alias,
  apt,
  cat: (args, ctx) => ctx.runWorker(`cat ${args}`),
  grep: (args, ctx) => ctx.runWorker(`grep ${args}`),
  jq: (args, ctx) => ctx.runWorker(`jq ${args}`),
};

export default registry;
export type { CommandHandler, CommandContext } from './types';
