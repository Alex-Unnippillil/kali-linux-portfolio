export type CommandPaletteItemType = 'app' | 'window' | 'action' | 'doc' | 'route';

export type CommandPaletteItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  keywords?: string[];
  href?: string;
  data?: Record<string, unknown>;
  type: CommandPaletteItemType;
};

export type CommandPaletteSection = {
  type: CommandPaletteItemType;
  label: string;
  items: CommandPaletteItem[];
};
