export interface NavigationItem {
  id: string;
  label: string;
  description?: string;
  children?: NavigationItem[];
}

export const SETTINGS_NAVIGATION: NavigationItem[] = [
  {
    id: "appearance",
    label: "Appearance",
    children: [
      {
        id: "appearance.theme",
        label: "Theme & Accent",
        description: "Set the desktop theme and accent color palette.",
      },
      {
        id: "appearance.wallpaper",
        label: "Wallpaper & Slideshow",
        description: "Choose wallpapers or enable the rotating slideshow.",
      },
      {
        id: "appearance.reset",
        label: "Reset Desktop",
        description: "Restore wallpapers, colors, and layout defaults.",
      },
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    children: [
      {
        id: "accessibility.display",
        label: "Display & Layout",
        description: "Adjust icon sizing and overall interface density.",
      },
      {
        id: "accessibility.interaction",
        label: "Interaction",
        description: "Toggle accessibility helpers and manage shortcuts.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Data",
    children: [
      {
        id: "privacy.data",
        label: "Import & Export",
        description: "Back up or restore your desktop configuration.",
      },
    ],
  },
];

const navigationMap = new Map<string, NavigationItem>();
const navigationPaths = new Map<string, string[]>();

const buildIndex = (
  items: NavigationItem[],
  parentPath: string[] = []
): void => {
  items.forEach((item) => {
    const currentPath = [...parentPath, item.id];
    navigationMap.set(item.id, item);
    navigationPaths.set(item.id, currentPath);
    if (item.children && item.children.length > 0) {
      buildIndex(item.children, currentPath);
    }
  });
};

buildIndex(SETTINGS_NAVIGATION);

const findFirstLeaf = (items: NavigationItem[]): NavigationItem | undefined => {
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      const leaf = findFirstLeaf(item.children);
      if (leaf) return leaf;
    } else {
      return item;
    }
  }
  return undefined;
};

export const DEFAULT_SECTION_ID = findFirstLeaf(SETTINGS_NAVIGATION)?.id ?? "";

export const getNavigationItem = (id: string): NavigationItem | undefined =>
  navigationMap.get(id);

export const getNavigationPath = (id: string): string[] =>
  navigationPaths.get(id) ?? [];

export const isLeafId = (id: string): boolean => {
  const item = navigationMap.get(id);
  return !!item && (!item.children || item.children.length === 0);
};
