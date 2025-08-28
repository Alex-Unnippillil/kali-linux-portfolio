import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Command {
  id: string;
  name: string;
  keywords?: string[];
  action: () => void;
}

interface CommandsContextValue {
  commands: Command[];
  register: (command: Command) => void;
  unregister: (id: string) => void;
}

const CommandsContext = createContext<CommandsContextValue>({
  commands: [],
  register: () => {},
  unregister: () => {},
});

export function CommandsProvider({ children }: { children: ReactNode }) {
  const [commands, setCommands] = useState<Command[]>([]);

  const register = useCallback((command: Command) => {
    setCommands((prev) => {
      const without = prev.filter((c) => c.id !== command.id);
      return [...without, command];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <CommandsContext.Provider value={{ commands, register, unregister }}>
      {children}
    </CommandsContext.Provider>
  );
}

export function useCommands() {
  return useContext(CommandsContext);
}

export function useCommand(command: Command, deps: unknown[] = []) {
  const { register, unregister } = useCommands();
  useEffect(() => {
    register(command);
    return () => unregister(command.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

