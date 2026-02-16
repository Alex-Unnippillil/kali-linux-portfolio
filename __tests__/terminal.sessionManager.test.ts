import { createSessionManager } from '../apps/terminal/utils/sessionManager';
import type { CommandContext, CommandDefinition } from '../apps/terminal/commands';

const buildContext = (): CommandContext => ({
  writeLine: jest.fn(),
  files: {},
  fs: {
    resolvePath: (cwd: string, target: string) => `${cwd}/${target}`,
    getHandle: async () => null,
    readDirectory: async () => [],
    readFile: async () => null,
    writeFile: async () => false,
    createDirectory: async () => false,
    deleteEntry: async () => false,
    exists: async () => false,
  },
  cwd: '/home',
  setCwd: jest.fn(),
  history: [],
  aliases: {},
  safeMode: true,
  setAlias: jest.fn(),
  runWorker: async () => {},
  clear: jest.fn(),
  listCommands: () => [],
});

describe('sessionManager', () => {
  it('restores buffer after autocomplete candidates', () => {
    const ctx = buildContext();
    const writes: string[] = [];
    const registry: Record<string, CommandDefinition> = {
      help: { name: 'help', description: 'Help', handler: jest.fn() },
      hello: { name: 'hello', description: 'Hello', handler: jest.fn() },
    };
    const manager = createSessionManager({
      getRegistry: () => registry,
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    manager.setBuffer('h');
    manager.autocomplete();
    expect(writes.join('')).toContain('[prompt]');
    expect(writes.join('')).toContain('h');
  });


  it('autocompletes command names on tab input', () => {
    const ctx = buildContext();
    const writes: string[] = [];
    const registry: Record<string, CommandDefinition> = {
      help: { name: 'help', description: 'Help', handler: jest.fn() },
      clear: { name: 'clear', description: 'Clear', handler: jest.fn() },
    };
    const manager = createSessionManager({
      getRegistry: () => registry,
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    manager.handleInput('he	');

    expect(manager.getBuffer()).toBe('help');
    expect(writes.join('')).toContain('lp');
    expect(writes.join('')).not.toContain('	');
  });

  it('skips autocomplete when buffer contains whitespace', () => {
    const ctx = buildContext();
    const writes: string[] = [];
    const registry: Record<string, CommandDefinition> = {
      cat: { name: 'cat', description: 'Concatenate', handler: jest.fn() },
      clear: { name: 'clear', description: 'Clear', handler: jest.fn() },
    };
    const manager = createSessionManager({
      getRegistry: () => registry,
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    manager.handleInput('cat R	');

    expect(manager.getBuffer()).toBe('cat R');
    expect(writes.join('')).not.toContain('[prompt]');
  });

  it('navigates history with arrow keys', () => {
    const ctx = buildContext();
    ctx.history = ['ls', 'cat README.md'];
    const writes: string[] = [];
    const manager = createSessionManager({
      getRegistry: () => ({}),
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    manager.handleInput('\x1b[A');
    expect(writes.join('')).toContain('cat README.md');
  });

  it('blocks risky commands in safe mode', async () => {
    const ctx = buildContext();
    const writes: string[] = [];
    const manager = createSessionManager({
      getRegistry: () => ({}),
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    await manager.runCommand('curl https://example.com');
    expect(writes.join('')).toContain('Safe mode');
  });
});
