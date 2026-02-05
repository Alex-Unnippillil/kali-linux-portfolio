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

  it('routes piped commands to the worker', async () => {
    const ctx = buildContext();
    const writes: string[] = [];
    const runWorker = jest.fn(async () => {});
    ctx.runWorker = runWorker;
    const manager = createSessionManager({
      getRegistry: () => ({}),
      context: ctx,
      prompt: () => writes.push('[prompt]'),
      write: (text) => writes.push(text),
      writeLine: (text) => writes.push(text + '\n'),
    });

    await manager.runCommand('cat README.md | grep Welcome');
    expect(runWorker).toHaveBeenCalledWith('cat README.md | grep Welcome');
  });

  it('edits text in the middle of the line', () => {
    const ctx = buildContext();
    const manager = createSessionManager({
      getRegistry: () => ({}),
      context: ctx,
      prompt: jest.fn(),
      write: jest.fn(),
      writeLine: jest.fn(),
    });

    manager.handleInput('abc');
    manager.handleInput('\x1b[D');
    manager.handleInput('X');
    expect(manager.getBuffer()).toBe('abXc');
  });
});
