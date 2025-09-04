const store: Record<string, string> = {};

export function setValue(key: string, value: string): void {
  store[key] = value;
}

export function getValue(key: string): string | undefined {
  return store[key];
}

export function getAll(): Record<string, string> {
  return { ...store };
}

export function clearStore(): void {
  for (const k of Object.keys(store)) {
    delete store[k];
  }
}

const moduleStore = { setValue, getValue, getAll, clearStore };

export default moduleStore;
