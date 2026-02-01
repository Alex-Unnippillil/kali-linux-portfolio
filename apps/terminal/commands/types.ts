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
  getAutocompleteEntries?: (fragment: string) => string[];
  vfs?: {
    getTree: () => import('../utils/vfs').FauxNode | null;
    setTree: (tree: import('../utils/vfs').FauxNode) => void;
    getCwd: () => string[];
    setCwd: (segments: string[]) => void;
    home: string[];
  };
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  handler: CommandHandler;
  safeModeBypass?: boolean;
}
