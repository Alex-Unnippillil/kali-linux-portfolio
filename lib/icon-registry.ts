export type IconDefinition = {
  src: string;
  alt?: string;
};

const iconRegistry = new Map<string, IconDefinition>();

export function registerIcon(name: string, definition: IconDefinition) {
  iconRegistry.set(name, definition);
}

export function getIconDefinition(name: string): IconDefinition | undefined {
  return iconRegistry.get(name);
}

export function hasIcon(name: string): boolean {
  return iconRegistry.has(name);
}

export function unregisterIcon(name: string) {
  iconRegistry.delete(name);
}

export function listIcons(): string[] {
  return Array.from(iconRegistry.keys());
}
