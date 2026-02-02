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
  updateConfig: (config: Partial<SessionManagerConfig>) => void;
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
  // Mutable config state
  let currentConfig: SessionManagerConfig = {
    getRegistry,
    context,
    prompt,
    write,
    writeLine,
    onHistoryUpdate,
    onCancelRunning
  };

  const updateConfig = (newConfig: Partial<SessionManagerConfig>) => {
    currentConfig = { ...currentConfig, ...newConfig };
  };

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
    const alias = currentConfig.context.aliases[name];
    const expanded = alias
      ? `${alias} ${rest.join(' ')}`.trim()
      : trimmed;
    const [cmdName, ...cmdArgs] = expanded.split(/\s+/);
    const registry = currentConfig.getRegistry();
    const definition = registry[cmdName];
    const handler = definition?.handler;
    currentConfig.context.history.push(trimmed);
    currentConfig.onHistoryUpdate?.(currentConfig.context.history);

    // safe mode checks
    const riskyCommands = ['nmap', 'curl', 'wget', 'ssh', 'nc', 'netcat', 'telnet', 'ping'];
    const looksNetworkBound = /https?:\/\//i.test(expanded) || riskyCommands.includes(cmdName);
    if (currentConfig.context.safeMode && looksNetworkBound && !definition?.safeModeBypass) {
      currentConfig.writeLine('Safe mode: this command is simulated and cannot reach the network.');
      currentConfig.writeLine(`[simulated] ${expanded}`);
      return;
    }

    if (handler) {
      running = true;
      try {
        await handler(cmdArgs.join(' '), currentConfig.context);
      } finally {
        running = false;
      }
    } else if (cmdName) {
      running = true;
      try {
        await currentConfig.context.runWorker(expanded);
      } finally {
        running = false;
      }
    }
  };

  const autocomplete = () => {
    const registry = currentConfig.getRegistry();
    const entries = Object.values(registry);
    const matches = entries.filter((c) => c.name.startsWith(buffer));
    if (matches.length === 1) {
      const completion = matches[0].name.slice(buffer.length);
      if (completion) currentConfig.write(completion);
      buffer = matches[0].name;
    } else if (matches.length > 1) {
      matches
        .map(({ name, description }) => {
          const padded = `${name}${' '.repeat(Math.max(2, 16 - name.length))}`;
          return `${padded}${description}`;
        })
        .forEach((line) => currentConfig.writeLine(line));
      currentConfig.prompt();
      if (buffer) currentConfig.write(buffer);
    }
  };

  const executeAndPrompt = (command: string) => {
    void runCommand(command).finally(() => {
      if (suppressNextPrompt) {
        suppressNextPrompt = false;
        return;
      }
      currentConfig.prompt();
    });
  };

  const clearCurrentLine = () => {
    if (buffer.length === 0) return;
    const erase = '\b \b'.repeat(buffer.length);
    currentConfig.write(erase);
  };

  const replaceBuffer = (next: string) => {
    clearCurrentLine();
    buffer = next;
    if (buffer) {
      currentConfig.write(buffer);
    }
  };

  const applyHistory = (direction: 'up' | 'down') => {
    const history = currentConfig.context.history;
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
      currentConfig.onCancelRunning?.();
      running = false;
    }
    // Echo ^C
    currentConfig.write('^C\r\n');
    buffer = '';
    historyIndex = null;
    draftBuffer = '';
    currentConfig.prompt();
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
  };

  const handleInput = (data: string) => {
    // Debug: echo raw input char codes to confirm receipt
    // currentConfig.write(`[DEBUG: ${data.split('').map(c => c.charCodeAt(0)).join(',')}]`);
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
      if (ch === '\x03') { // Ctrl+C
        cancelInput();
        i += 1;
        continue;
      }
      if (ch === '\r') {
        currentConfig.write('\r\n'); // Echo newline
        const command = buffer;
        buffer = '';
        historyIndex = null;
        draftBuffer = '';
        executeAndPrompt(command);
        i += 1;
        continue;
      }
      if (ch === '\u007F') { // Backspace
        if (buffer.length > 0) {
          currentConfig.write('\b \b');
          buffer = buffer.slice(0, -1);
        }
        i += 1;
        continue;
      }
      if (ch >= ' ') {
        buffer += ch;
        currentConfig.write(ch);
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
  const setBuffer = (value: string) => { buffer = value; };

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
    updateConfig,
  };
}

export type { CommandContext } from '../commands';
