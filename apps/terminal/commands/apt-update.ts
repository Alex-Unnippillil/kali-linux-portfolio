import type { CommandContext } from './types';
import type { ScriptController } from '../utils/scriptRunner';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function aptUpdate(_args: string, ctx: CommandContext): ScriptController {
  let aborted = false;
  const cancel = () => {
    aborted = true;
  };

  const finished = (async () => {
    const stages = [
      'Hit:1 http://http.kali.org/kali kali-rolling InRelease',
      'Get:2 http://http.kali.org/kali kali-rolling/main amd64 Packages [15.2 MB]',
      'Fetched 15.2 MB in 1s (15.2 MB/s)',
      'Reading package lists... Done',
      'Building dependency tree... Done',
      'Reading state information... Done',
    ];

    for (const line of stages) {
      if (aborted) throw new Error('canceled');
      ctx.writeLine(line);
      await sleep(20);
    }

    const total = 20;
    for (let i = 0; i <= total; i++) {
      if (aborted) throw new Error('canceled');
      const pct = Math.round((i / total) * 100);
      const filled = '#'.repeat(i);
      const empty = '-'.repeat(total - i);
      ctx.writeLine(`\x1b[32m[${filled}${empty}] ${pct}%\x1b[0m`);
      await sleep(20);
    }

    if (aborted) throw new Error('canceled');
    ctx.writeLine('All packages are up to date.');
  })();

  return { cancel, finished };
}

