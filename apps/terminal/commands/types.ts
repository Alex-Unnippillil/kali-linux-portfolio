export interface CommandContext {
  writeLine: (text: string) => void;
  files: Record<string, string>;
  history: string[];
  aliases: Record<string, string>;
  safeMode: boolean;
  setAlias: (name: string, value: string) => void;
  runWorker: (command: string) => Promise<void>;
  clear: () => void;
  closeApp?: () => void;
  openApp?: (id: string) => void;
  listCommands: () => CommandDefinition[];
}

export type CommandHandler = (args: string, ctx: CommandContext) => void | Promise<void>;

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  handler: CommandHandler;
}
