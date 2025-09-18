export interface TerminalCommand {
  id: string;
  title: string;
  snippet: string;
  description: string;
  keywords?: string[];
}

export const TERMINAL_COMMANDS: TerminalCommand[] = [
  {
    id: 'help',
    title: 'help',
    snippet: 'help',
    description: 'List available built-in commands and scripted examples.',
    keywords: ['commands', 'docs'],
  },
  {
    id: 'clear',
    title: 'clear',
    snippet: 'clear',
    description: 'Reset the terminal viewport and remove the scrollback buffer.',
    keywords: ['reset', 'screen'],
  },
  {
    id: 'list-files',
    title: 'ls',
    snippet: 'ls',
    description: 'Show files that are saved in the virtual home directory.',
    keywords: ['files', 'list'],
  },
  {
    id: 'view-readme',
    title: 'cat README.md',
    snippet: 'cat README.md',
    description: 'Display the demo README file bundled with the terminal.',
    keywords: ['readme', 'view'],
  },
  {
    id: 'search-readme',
    title: 'grep "portfolio" README.md',
    snippet: 'grep "portfolio" README.md',
    description: 'Search the README output for references to the portfolio.',
    keywords: ['search', 'grep'],
  },
  {
    id: 'open-terminal',
    title: 'open terminal',
    snippet: 'open terminal',
    description: 'Launch another terminal window alongside the current session.',
    keywords: ['apps', 'open'],
  },
  {
    id: 'history',
    title: 'history',
    snippet: 'history',
    description: 'Print the command history stored for the active session.',
    keywords: ['commands', 'previous'],
  },
  {
    id: 'alias',
    title: "alias ll='ls -al'",
    snippet: "alias ll='ls -al'",
    description: 'Create a handy alias for listing files with permissions.',
    keywords: ['alias', 'configure'],
  },
  {
    id: 'manual',
    title: 'man alias',
    snippet: 'man alias',
    description: 'Open the manual page for the alias helper.',
    keywords: ['docs', 'reference'],
  },
];
