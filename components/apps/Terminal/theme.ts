import type { ITerminalOptions } from '@xterm/xterm';

// Styled prompt with ANSI colors: bright green for user/host and path, reset before input
export const PROMPT = '\x1b[1;32mkali@web:~$\x1b[0m ';

// Terminal theme options, including cursor style and blinking
const theme: ITerminalOptions = {
  cursorBlink: true,
  theme: {
    background: 'var(--kali-bg)',
    foreground: '#C5C8C6',
    cursor: '#C5C8C6',
    cursorAccent: '#000000',
  },
};

export default theme;
