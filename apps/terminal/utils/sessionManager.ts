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
    onCancelRunning,
    onCommand,
  };

  const updateConfig = (newConfig: Partial<SessionManagerConfig>) => {
    currentConfig = { ...currentConfig, ...newConfig };
  };

  let terminal: XTerm | null = null;
  let buffer = '';
  let cursorPos = 0;
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

    if (expanded.includes('|')) {
      running = true;
      try {
        await currentConfig.context.runWorker(expanded);
      } finally {
        running = false;
      }
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

  const moveCursorLeft = (count: number) => {
    if (count > 0) currentConfig.write(`\x1b[${count}D`);
  };

  const moveCursorRight = (count: number) => {
    if (count > 0) currentConfig.write(`\x1b[${count}C`);
  };

  const renderLine = (nextBuffer: string, nextCursorPos: number) => {
    moveCursorLeft(cursorPos);
    currentConfig.write('\x1b[K');
    if (nextBuffer) currentConfig.write(nextBuffer);
    moveCursorLeft(nextBuffer.length - nextCursorPos);
    buffer = nextBuffer;
    cursorPos = nextCursorPos;
  };

  const renderPrompt = () => {
    currentConfig.prompt();
    if (buffer) {
      currentConfig.write(buffer);
      moveCursorLeft(buffer.length - cursorPos);
    }
  };

  const replaceBuffer = (next: string) => {
    renderLine(next, next.length);
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
    cursorPos = 0;
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
    if (sequence === '\x1b[D') {
      if (cursorPos > 0) {
        moveCursorLeft(1);
        cursorPos -= 1;
      }
      return;
    }
    if (sequence === '\x1b[C') {
      if (cursorPos < buffer.length) {
        moveCursorRight(1);
        cursorPos += 1;
      }
      return;
    }
    if (sequence === '\x1b[H' || sequence === '\x1b[1~') {
      moveCursorLeft(cursorPos);
      cursorPos = 0;
      return;
    }
    if (sequence === '\x1b[F' || sequence === '\x1b[4~') {
      moveCursorRight(buffer.length - cursorPos);
      cursorPos = buffer.length;
      return;
    }
    if (sequence === '\x1b[3~') {
      if (cursorPos < buffer.length) {
        const nextBuffer = `${buffer.slice(0, cursorPos)}${buffer.slice(cursorPos + 1)}`;
        renderLine(nextBuffer, cursorPos);
      }
    }
  };

  const insertText = (text: string) => {
    if (!text) return;
    const nextBuffer = `${buffer.slice(0, cursorPos)}${text}${buffer.slice(cursorPos)}`;
    renderLine(nextBuffer, cursorPos + text.length);
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
          cursorPos = buffer.length;
          currentConfig.write('\r\n');
          renderPrompt();
          i += 1;
          continue;
        }
        if (ch === '\x1b' || ch === '\x07') {
          reverseSearchActive = false;
          buffer = reverseSearchBaseBuffer;
          cursorPos = buffer.length;
          currentConfig.write('\r\n');
          renderPrompt();
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
          while (end < data.length && !/[A-Za-z~]/.test(data[end])) {
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
        cursorPos = 0;
        historyIndex = null;
        draftBuffer = '';
        executeAndPrompt(command);
        i += 1;
        continue;
      }
      if (ch === '\u007F') { // Backspace
        if (cursorPos > 0) {
          const nextBuffer = `${buffer.slice(0, cursorPos - 1)}${buffer.slice(cursorPos)}`;
          renderLine(nextBuffer, cursorPos - 1);
        }
        i += 1;
        continue;
      }
      if (ch >= ' ') {
        insertText(ch);
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
    const hasNewlines = normalized.includes('\n');
    const flattened = normalized.replace(/\n+/g, ' ');
    if (hasNewlines) {
      currentConfig.write('\r\n');
      currentConfig.writeLine('[System] Pasted multi-line content. Review, then press Enter.');
      renderPrompt();
    }
    insertText(flattened);
  };

  const getBuffer = () => buffer;
  const setBuffer = (value: string) => {
    buffer = value;
    cursorPos = value.length;
  };

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
