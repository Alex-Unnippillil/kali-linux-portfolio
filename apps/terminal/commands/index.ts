import type { CommandHandler, CommandContext } from './types';
import aptUpdate from './apt-update';

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

function neofetch(_args: string, ctx: CommandContext) {
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--color-primary').trim() || '#1793d1';
  const text = style.getPropertyValue('--color-text').trim() || '#f5f5f5';

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [
      (num >> 16) & 0xff,
      (num >> 8) & 0xff,
      num & 0xff,
    ];
  };

  const ansi = (hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    return `\x1b[38;2;${r};${g};${b}m`;
  };

  const c1 = ansi(primary);
  const c2 = ansi(text);
  const reset = '\x1b[0m';

  const lines = [
    `${c1}..............`,
    `            ..,;:ccc,.`,
    `          ......''';lxO.`,
    `.....''''..........,:ld;`,
    `           .';;;:::;,,.x,`,
    `      ..'''.            0Xxoc:,.  ...`,
    `  ....                ,ONkc;,;cokOdc',.`,
    ` .                   OMo           ':${c2}dd${c1}o.`,
    `                    dMc               :OO;`,
    `                    0M.                 .:o.`,
    `                    ;Wd`,
    `                     ;XO,`,
    `                       ,d0Odlc;,..`,
    `                           ..',;:cdOOd::,.`,
    `                                    .:d;.':;.`,
    `                                       'd,  .'`,
    `                                         ;l   ..`,
    `                                          .o`,
    `                                            c${reset}`,
    '',
  ];
  lines.forEach((line) => ctx.writeLine(line));

  const variant = document.documentElement.classList.contains('dark')
    ? 'Dark'
    : 'Light';
  ctx.writeLine(`${c2}Theme: Undercover (${variant})${reset}`);
}

async function apt(args: string, ctx: CommandContext) {
  const sub = args.trim();
  if (sub === 'update') {
    const ctrl = aptUpdate('', ctx);
    try {
      await ctrl.finished;
    } catch (e: any) {
      if (e?.message === 'canceled') {
        ctx.writeLine('\x1b[31mOperation canceled\x1b[0m');
      } else {
        throw e;
      }
    }
  } else {
    ctx.writeLine('Usage: apt update');
  }
}

const registry: Record<string, CommandHandler> = {
  man,
  history,
  alias,
  neofetch,
  apt,
  cat: (args, ctx) => ctx.runWorker(`cat ${args}`),
  grep: (args, ctx) => ctx.runWorker(`grep ${args}`),
  jq: (args, ctx) => ctx.runWorker(`jq ${args}`),
};

export default registry;
export type { CommandHandler, CommandContext } from './types';
