"use client";

import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import usePersistentState from './usePersistentState';

export type DeveloperToolsState = {
  contrastAuditor: boolean;
};

const DEFAULT_STATE: DeveloperToolsState = {
  contrastAuditor: false,
};

const isValidState = (value: unknown): value is DeveloperToolsState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as DeveloperToolsState).contrastAuditor === 'boolean';

type DeveloperToolKey = keyof DeveloperToolsState;

export interface DeveloperToolsContextValue {
  tools: DeveloperToolsState;
  setTool: (tool: DeveloperToolKey, value: boolean) => void;
  toggleTool: (tool: DeveloperToolKey) => void;
  reset: () => void;
}

const DeveloperToolsContext = createContext<DeveloperToolsContextValue>({
  tools: DEFAULT_STATE,
  setTool: () => {},
  toggleTool: () => {},
  reset: () => {},
});

export const DeveloperToolsProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [tools, setTools, resetTools] = usePersistentState<DeveloperToolsState>(
    'developer-tools',
    DEFAULT_STATE,
    isValidState,
  );

  const value = useMemo<DeveloperToolsContextValue>(() => {
    const setTool: DeveloperToolsContextValue['setTool'] = (tool, value) => {
      setTools(prev => ({
        ...prev,
        [tool]: value,
      }));
    };

    const toggleTool: DeveloperToolsContextValue['toggleTool'] = tool => {
      setTools(prev => ({
        ...prev,
        [tool]: !prev[tool],
      }));
    };

    const reset = () => {
      resetTools();
    };

    return {
      tools,
      setTool,
      toggleTool,
      reset,
    };
  }, [resetTools, setTools, tools]);

  return <DeveloperToolsContext.Provider value={value}>{children}</DeveloperToolsContext.Provider>;
};

export const useDeveloperTools = (): DeveloperToolsContextValue => useContext(DeveloperToolsContext);
