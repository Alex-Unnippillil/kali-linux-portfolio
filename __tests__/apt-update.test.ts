import aptUpdate from '../apps/terminal/commands/apt-update';
import type { CommandContext } from '../apps/terminal/commands';

const createCtx = () => {
  const lines: string[] = [];
  const ctx: CommandContext = {
    writeLine: (t: string) => lines.push(t),
    files: {},
    history: [],
    aliases: {},
    setAlias: () => {},
    runWorker: async () => {},
  };
  return { ctx, lines };
};

describe('apt-update command', () => {
  it('emits progress and completion', async () => {
    const { ctx, lines } = createCtx();
    const ctrl = aptUpdate('', ctx);
    await ctrl.finished;
    expect(lines[0]).toMatch(/Hit:1/);
    expect(lines.some((l) => l.includes('\x1b[32m['))).toBe(true);
    expect(lines.at(-1)).toBe('All packages are up to date.');
  });

  it('can be canceled', async () => {
    const { ctx, lines } = createCtx();
    const ctrl = aptUpdate('', ctx);
    ctrl.cancel();
    await expect(ctrl.finished).rejects.toThrow('canceled');
    expect(lines).not.toContain('All packages are up to date.');
  });
});

