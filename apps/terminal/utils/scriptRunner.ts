export interface CommandStep {
  type: 'command';
  command: string;
}

export interface SleepStep {
  type: 'sleep';
  ms: number;
}

export type ScriptStep = CommandStep | SleepStep;

/**
 * Parse simple DSL scripts.
 * Supports lines of commands and `sleep <ms>` to pause.
 * Lines beginning with `#` are treated as comments.
 */
export function parseScript(source: string): ScriptStep[] {
  return source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const sleepMatch = line.match(/^sleep\s+(\d+)$/i);
      if (sleepMatch) {
        return { type: 'sleep', ms: parseInt(sleepMatch[1]!, 10) } as SleepStep;
      }
      return { type: 'command', command: line } as CommandStep;
    });
}

export interface ScriptController {
  cancel: () => void;
  finished: Promise<void>;
}

/**
 * Run a script using the provided command executor.
 * Returns a controller that can cancel execution.
 */
export function runScript(
  source: string,
  exec: (command: string) => Promise<any> | any,
  args: string[] = [],
): ScriptController {
  const steps = parseScript(source);
  let aborted = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectFn: ((reason?: any) => void) | undefined;

  const finished = new Promise<void>(async (resolve, reject) => {
    rejectFn = reject;
    try {
      for (const step of steps) {
        if (aborted) break;
        if (step.type === 'command') {
          const command = step.command.replace(/\$(\d+)/g, (_, n) => {
            const idx = parseInt(n, 10) - 1;
            return args[idx] ?? '';
          });
          await exec(command);
        } else {
          await new Promise<void>((res) => {
            timeout = setTimeout(res, step.ms);
          });
        }
      }
      if (!aborted) resolve();
    } catch (err) {
      reject(err);
    }
  });

  const cancel = () => {
    aborted = true;
    if (timeout) clearTimeout(timeout);
    rejectFn?.(new Error('canceled'));
  };

  return { cancel, finished };
}

export default runScript;
