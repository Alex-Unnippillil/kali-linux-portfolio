import type { Terminal as XTerm } from '@xterm/xterm';
import type { CommandContext, CommandHandler } from '../commands';

export interface SessionManagerConfig {
  getRegistry: () => Record<string, CommandHandler>;
  context: CommandContext;
  prompt: () => void;
  write: (text: string) => void;
  writeLine: (text: string) => void;
}

export interface SessionManager {
  setTerminal: (term: XTerm | null) => void;
  runCommand: (input: string) => Promise<void>;
  handleInput: (data: string) => void;
  handlePaste: (text: string) => void;
  autocomplete: () => void;
  getBuffer: () => string;
  setBuffer: (value: string) => void;
  setScrollbackLimit: (limit: number) => void;
  getScrollbackLimit: () => number;
}

export function createSessionManager({
  getRegistry,
  context,
  prompt,
  write,
  writeLine,
}: SessionManagerConfig): SessionManager {
  let terminal: XTerm | null = null;
  let buffer = '';
  let scrollbackLimit = 1000;

  const setTerminal = (term: XTerm | null) => {
    terminal = term;
    if (terminal) {
      (terminal.options as any).scrollback = scrollbackLimit;
    }
  };

  const getScrollbackLimit = () => scrollbackLimit;

  const setScrollbackLimit = (limit: number) => {
    scrollbackLimit = limit;
    if (terminal) {
      (terminal.options as any).scrollback = limit;
    }
  };

  const runCommand = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const [name, ...rest] = trimmed.split(/\s+/);
    const alias = context.aliases[name];
    const expanded = alias
      ? `${alias} ${rest.join(' ')}`.trim()
      : trimmed;
    const [cmdName, ...cmdArgs] = expanded.split(/\s+/);
    const registry = getRegistry();
    const handler = registry[cmdName];
    context.history.push(trimmed);
    if (handler) {
      await handler(cmdArgs.join(' '), context);
    } else if (cmdName) {
      await context.runWorker(expanded);
    }
  };

  const autocomplete = () => {
    const registry = getRegistry();
    const matches = Object.keys(registry).filter((c) => c.startsWith(buffer));
    if (matches.length === 1) {
      const completion = matches[0].slice(buffer.length);
      if (completion) write(completion);
      buffer = matches[0];
    } else if (matches.length > 1) {
      writeLine(matches.join('  '));
      prompt();
      if (buffer) write(buffer);
    }
  };

  const executeAndPrompt = (command: string) => {
    void runCommand(command).finally(() => {
      prompt();
    });
  };

  const handleInput = (data: string) => {
    for (const ch of data) {
      if (ch === '\r') {
        if (terminal) terminal.writeln('');
        const command = buffer;
        buffer = '';
        executeAndPrompt(command);
      } else if (ch === '\u007F') {
        if (buffer.length > 0) {
          if (terminal) terminal.write('\b \b');
          buffer = buffer.slice(0, -1);
        }
      } else {
        buffer += ch;
        write(ch);
      }
    }
  };

  const handlePaste = (text: string) => {
    if (!text) return;
    const normalized = text.replace(/\r\n|\r/g, '\n');
    const expanded = normalized.replace(/\n/g, '\r');
    handleInput(expanded);
  };

  const getBuffer = () => buffer;

  const setBuffer = (value: string) => {
    buffer = value;
  };

  return {
    setTerminal,
    runCommand,
    handleInput,
    handlePaste,
    autocomplete,
    getBuffer,
    setBuffer,
    setScrollbackLimit,
    getScrollbackLimit,
  };
}

export type { CommandContext } from '../commands';
