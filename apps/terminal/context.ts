import { createContext } from 'react';

export type TerminalCommandPayload = {
  command?: string;
  requestId?: number;
};

export const TerminalCommandContext = createContext<TerminalCommandPayload | null>(null);
