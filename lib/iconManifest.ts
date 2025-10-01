import iconManifest from '@/data/icons/manifest.json';

type RawManifest = typeof iconManifest;

type IconDefinition = RawManifest['icons'][number];

type IconName = IconDefinition['name'];

type IconSize = RawManifest['sizes'][number];

const ICON_MANIFEST = iconManifest as RawManifest;

const ICON_SIZES = [...ICON_MANIFEST.sizes] as IconSize[];

const SORTED_ICON_SIZES = [...ICON_SIZES].sort((a, b) => a - b);

const ICON_DEFINITIONS = [...ICON_MANIFEST.icons] as IconDefinition[];

const ICON_NAMES = ICON_DEFINITIONS.map((icon) => icon.name) as IconName[];

const iconMetaMap = Object.fromEntries(
  ICON_DEFINITIONS.map((icon) => [icon.name, icon] as const),
) as Record<IconName, IconDefinition>;

const iconSizeSet = new Set(ICON_SIZES);

const DEFAULT_ICON_SIZE = ICON_SIZES.includes(64 as IconSize)
  ? (64 as IconSize)
  : SORTED_ICON_SIZES[0];

const resolveIconSize = (size?: number): IconSize => {
  if (size && iconSizeSet.has(size as IconSize)) {
    return size as IconSize;
  }

  if (typeof size === 'number' && size > 0) {
    for (const candidate of SORTED_ICON_SIZES) {
      if (candidate >= size) {
        return candidate;
      }
    }
    return SORTED_ICON_SIZES[SORTED_ICON_SIZES.length - 1];
  }

  return DEFAULT_ICON_SIZE;
};

const resolveIconPath = (name: IconName, size: IconSize): string => `/icons/${size}/${name}.svg`;

const getIconDefinition = (name: IconName): IconDefinition => iconMetaMap[name];

export type { IconDefinition, IconName, IconSize };

export {
  ICON_DEFINITIONS,
  ICON_MANIFEST,
  ICON_NAMES,
  ICON_SIZES,
  DEFAULT_ICON_SIZE,
  resolveIconPath,
  resolveIconSize,
  getIconDefinition,
};
