import type { Terminal as XTerm } from '@xterm/xterm';
import type { CommandContext, CommandDefinition, CommandHandler } from '../commands';

export interface SessionManagerConfig {
  getRegistry: () => Record<string, CommandDefinition>;
  context: CommandContext;
  prompt: () => void;
  write: (text: string) => void;
  writeLine: (text: string) => void;
  onHistoryUpdate?: (history: string[]) => void;
  onCancelRunning?: () => void;
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
  onHistoryUpdate,
  onCancelRunning,
}: SessionManagerConfig): SessionManager {
  let terminal: XTerm | null = null;
  let buffer = '';
  let scrollbackLimit = 1000;
  let historyIndex: number | null = null;
  let draftBuffer = '';
  let running = false;
  let suppressNextPrompt = false;

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
    const definition = registry[cmdName];
    const handler = definition?.handler;
    context.history.push(trimmed);
    onHistoryUpdate?.(context.history);
    const riskyCommands = ['nmap', 'curl', 'wget', 'ssh', 'nc', 'netcat', 'telnet', 'ping'];
    const looksNetworkBound = /https?:\/\//i.test(expanded) || riskyCommands.includes(cmdName);
    if (context.safeMode && looksNetworkBound && !definition?.safeModeBypass) {
      writeLine('Safe mode: this command is simulated and cannot reach the network.');
      writeLine(`[simulated] ${expanded}`);
      return;
    }
    if (handler) {
      running = true;
      try {
        await handler(cmdArgs.join(' '), context);
      } finally {
        running = false;
      }
    } else if (cmdName) {
      running = true;
      try {
        await context.runWorker(expanded);
      } finally {
        running = false;
      }
    }
  };

  const autocomplete = () => {
    const registry = getRegistry();
    const entries = Object.values(registry);
    const matches = entries.filter((c) => c.name.startsWith(buffer));
    if (matches.length === 1) {
      const completion = matches[0].name.slice(buffer.length);
      if (completion) write(completion);
      buffer = matches[0].name;
    } else if (matches.length > 1) {
      matches
        .map(({ name, description }) => {
          const padded = `${name}${' '.repeat(Math.max(2, 16 - name.length))}`;
          return `${padded}${description}`;
        })
        .forEach((line) => writeLine(line));
      prompt();
      if (buffer) write(buffer);
    }
  };

  const executeAndPrompt = (command: string) => {
    void runCommand(command).finally(() => {
      if (suppressNextPrompt) {
        suppressNextPrompt = false;
        return;
      }
      prompt();
    });
  };

  const clearCurrentLine = () => {
    if (!terminal || buffer.length === 0) return;
    const erase = '\b \b'.repeat(buffer.length);
    terminal.write(erase);
  };

  const replaceBuffer = (next: string) => {
    clearCurrentLine();
    buffer = next;
    if (buffer) {
      write(buffer);
    }
  };

  const applyHistory = (direction: 'up' | 'down') => {
    const history = context.history;
    if (!history.length) return;

    if (historyIndex === null) {
      draftBuffer = buffer;
      historyIndex = history.length - 1;
    } else if (direction === 'up' && historyIndex > 0) {
      historyIndex -= 1;
    } else if (direction === 'down' && historyIndex < history.length - 1) {
      historyIndex += 1;
    } else if (direction === 'down' && historyIndex === history.length - 1) {
      historyIndex = null;
      replaceBuffer(draftBuffer);
      return;
    }

    if (historyIndex !== null) {
      replaceBuffer(history[historyIndex]);
    }
  };

  const cancelInput = () => {
    if (running) {
      suppressNextPrompt = true;
      onCancelRunning?.();
      running = false;
    }
    if (terminal) {
      terminal.write('^C');
      terminal.writeln('');
    }
    buffer = '';
    historyIndex = null;
    draftBuffer = '';
    prompt();
  };

  const handleEscapeSequence = (sequence: string) => {
    if (sequence === '\x1b[A') {
      applyHistory('up');
      return;
    }
    if (sequence === '\x1b[B') {
      applyHistory('down');
      return;
    }
    // Ignore other navigation escape sequences.
  };

  const handleInput = (data: string) => {
    let i = 0;
    while (i < data.length) {
      const ch = data[i];
      if (ch === '\x1b') {
        let end = i + 1;
        if (data[end] === '[') {
          end += 1;
          while (end < data.length && !/[A-Za-z]/.test(data[end])) {
            end += 1;
          }
          if (end < data.length) {
            end += 1;
          }
        }
        const sequence = data.slice(i, end);
        handleEscapeSequence(sequence);
        i = end;
        continue;
      }
      if (ch === '\x03') {
        cancelInput();
        i += 1;
        continue;
      }
      if (ch === '\r') {
        if (terminal) terminal.writeln('');
        const command = buffer;
        buffer = '';
        historyIndex = null;
        draftBuffer = '';
        executeAndPrompt(command);
        i += 1;
        continue;
      }
      if (ch === '\u007F') {
        if (buffer.length > 0) {
          if (terminal) terminal.write('\b \b');
          buffer = buffer.slice(0, -1);
        }
        i += 1;
        continue;
      }
      if (ch >= ' ') {
        buffer += ch;
        write(ch);
      }
      i += 1;
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
