import type { VfsEntry } from '../../../stores/fileSystemStore';

export interface CommandContext {
  writeLine: (text: string) => void;
  files: Record<string, string>;
  history: string[];
  aliases: Record<string, string>;
  safeMode: boolean;
  setAlias: (name: string, value: string) => void;
  runWorker: (command: string) => Promise<void>;
  clear: () => void;
  openApp?: (id: string) => void;
  listCommands: () => CommandDefinition[];
  cwd: string;
  setCwd: (path: string) => void;
  vfs: {
    resolvePath: (path: string, cwd?: string) => string;
    listDirectory: (path: string) => VfsEntry[];
    getEntry: (path: string) => VfsEntry | null;
    createDirectory: (
      path: string,
      options?: { cwd?: string; recursive?: boolean },
    ) => { ok: boolean; message?: string };
    createFile: (
      path: string,
      content?: string,
      options?: { cwd?: string },
    ) => { ok: boolean; message?: string };
    writeFile: (
      path: string,
      content: string,
      options?: { cwd?: string },
    ) => { ok: boolean; message?: string };
    readFile: (
      path: string,
      options?: { cwd?: string },
    ) => { ok: boolean; content?: string; message?: string };
    removePath: (
      path: string,
      options?: { cwd?: string; recursive?: boolean },
    ) => { ok: boolean; message?: string };
  };
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  handler: CommandHandler;
}
