const registry: Record<string, { reset: () => void; serialize: () => any }> = {};

export const registerGame = (
  id: string,
  handlers: { reset: () => void; serialize: () => any }
): void => {
  registry[id] = handlers;
};

export const resetGame = (id: string): void => {
  registry[id]?.reset();
};

export const serializeGame = (id: string): any =>
  registry[id]?.serialize();

export const _getRegistry = () => registry;
