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
  onCommand?: (command: string) => void;
}

export interface SessionManager {
  setTerminal: (term: XTerm | null) => void;
  runCommand: (input: string) => Promise<void>;
  renderPrompt: () => void;
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
  onCommand,
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
  let reverseSearchActive = false;
  let reverseSearchQuery = '';
  let reverseSearchIndex: number | null = null;
  let reverseSearchBaseBuffer = '';

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
    currentConfig.onCommand?.(trimmed);

    // safe mode checks
    const riskyCommands = ['nmap', 'curl', 'wget', 'ssh', 'nc', 'netcat', 'telnet', 'ping'];
    const looksNetworkBound = /https?:\/\//i.test(expanded) || riskyCommands.includes(cmdName);
    if (currentConfig.context.safeMode && looksNetworkBound && !definition?.safeModeBypass) {
      currentConfig.writeLine(`Safe mode: "${cmdName}" blocked. Toggle Safe Mode to run simulated network commands.`);
      currentConfig.writeLine(`[blocked] ${expanded}`);
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
      currentConfig.write('\r\n');
      matches
        .map(({ name, description }) => {
          const padded = `${name}${' '.repeat(Math.max(2, 16 - name.length))}`;
          return `${padded}${description}`;
        })
        .forEach((line) => currentConfig.writeLine(line));
      renderPrompt();
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

  const renderPrompt = () => {
    currentConfig.prompt();
    if (buffer) {
      currentConfig.write(buffer);
    }
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
    if (reverseSearchActive) {
      return;
    }
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
      if (reverseSearchActive) {
        if (ch === '\x03') {
          reverseSearchActive = false;
          currentConfig.write('\r\n');
          cancelInput();
          i += 1;
          continue;
        }
        if (ch === '\r') {
          const history = currentConfig.context.history;
          const match =
            reverseSearchIndex !== null ? history[reverseSearchIndex] : reverseSearchBaseBuffer;
          reverseSearchActive = false;
          buffer = match || reverseSearchBaseBuffer;
          currentConfig.write('\r\n');
          currentConfig.prompt();
          if (buffer) currentConfig.write(buffer);
          i += 1;
          continue;
        }
        if (ch === '\x1b' || ch === '\x07') {
          reverseSearchActive = false;
          buffer = reverseSearchBaseBuffer;
          currentConfig.write('\r\n');
          currentConfig.prompt();
          if (buffer) currentConfig.write(buffer);
          i += 1;
          continue;
        }
        if (ch === '\u007F') {
          reverseSearchQuery = reverseSearchQuery.slice(0, -1);
        } else if (ch === '\x12') {
          if (reverseSearchIndex !== null) {
            reverseSearchIndex = reverseSearchIndex - 1;
          }
        } else if (ch >= ' ') {
          reverseSearchQuery += ch;
        }
        reverseSearchIndex = findReverseMatch(reverseSearchQuery, reverseSearchIndex);
        renderReverseSearch(reverseSearchQuery, reverseSearchIndex);
        i += 1;
        continue;
      }
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
      if (ch === '\x12') { // Ctrl+R reverse search
        reverseSearchActive = true;
        reverseSearchQuery = '';
        reverseSearchIndex = findReverseMatch(reverseSearchQuery, null);
        reverseSearchBaseBuffer = buffer;
        currentConfig.write('\r\n');
        renderReverseSearch(reverseSearchQuery, reverseSearchIndex);
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

  const findReverseMatch = (query: string, startIndex: number | null) => {
    const history = currentConfig.context.history;
    if (!history.length) return null;
    if (!query) {
      const fallback = startIndex ?? history.length - 1;
      return fallback >= 0 ? fallback : null;
    }
    let idx = startIndex ?? history.length - 1;
    for (; idx >= 0; idx -= 1) {
      if (history[idx].includes(query)) {
        return idx;
      }
    }
    return null;
  };

  const renderReverseSearch = (query: string, matchIndex: number | null) => {
    const history = currentConfig.context.history;
    const match = matchIndex !== null ? history[matchIndex] : '';
    currentConfig.write('\r\x1b[2K');
    currentConfig.write(`(reverse-i-search)\`${query}\`: ${match}`);
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
    renderPrompt,
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
