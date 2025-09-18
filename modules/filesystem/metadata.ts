export type SensitivityTag =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | (string & {});

export interface FileNodeInput {
  name: string;
  type: 'file' | 'directory';
  tags?: SensitivityTag[];
  children?: FileNodeInput[];
}

export interface FileMetadata {
  name: string;
  path: string;
  type: 'file' | 'directory';
  tags: SensitivityTag[];
  inheritedTags: SensitivityTag[];
  effectiveTags: SensitivityTag[];
  children?: FileMetadata[];
}

export type MetadataIndex = Map<string, FileMetadata>;

export const PUBLIC_TAG: SensitivityTag = 'public';

export const SENSITIVITY_LEVELS: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

const UNKNOWN_SENSITIVITY_FALLBACK = 1;

export const getSensitivityLevel = (tag: SensitivityTag): number =>
  tag in SENSITIVITY_LEVELS ? SENSITIVITY_LEVELS[tag] : UNKNOWN_SENSITIVITY_FALLBACK;

export const normalizePath = (input: string): string => {
  if (!input) return '/';
  if (input === '/') return '/';
  const parts = input.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  return `/${parts.join('/')}`;
};

const uniqueTags = (tags: SensitivityTag[]): SensitivityTag[] =>
  Array.from(new Set(tags));

const resolvePath = (node: FileNodeInput, parent?: FileMetadata): string => {
  if (!parent) return normalizePath(node.name);
  if (parent.path === '/') return normalizePath(`/${node.name}`);
  return normalizePath(`${parent.path}/${node.name}`);
};

const applyInheritance = (
  node: FileNodeInput,
  parent?: FileMetadata
): FileMetadata => {
  const ownTags = uniqueTags(node.tags ?? []);
  const inheritedTags = parent ? parent.effectiveTags : [];
  const effectiveTags = uniqueTags([...inheritedTags, ...ownTags]);
  const path = parent ? resolvePath(node, parent) : normalizePath(node.name);

  const metadata: FileMetadata = {
    name: node.name,
    path,
    type: node.type,
    tags: ownTags,
    inheritedTags,
    effectiveTags,
  };

  if (node.type === 'directory' && node.children?.length) {
    metadata.children = node.children.map((child) => applyInheritance(child, metadata));
  }

  return metadata;
};

const flattenMetadata = (
  node: FileMetadata,
  index: MetadataIndex = new Map()
): MetadataIndex => {
  index.set(node.path, node);
  node.children?.forEach((child) => flattenMetadata(child, index));
  return index;
};

export const buildMetadata = (root: FileNodeInput): {
  tree: FileMetadata;
  index: MetadataIndex;
} => {
  const tree = applyInheritance(root);
  return {
    tree,
    index: flattenMetadata(tree),
  };
};

const BASE_FILESYSTEM: FileNodeInput = {
  name: '/',
  type: 'directory',
  tags: [PUBLIC_TAG],
  children: [
    {
      name: 'public',
      type: 'directory',
      tags: [PUBLIC_TAG],
      children: [
        { name: 'readme.txt', type: 'file' },
        {
          name: 'wallpapers',
          type: 'directory',
          tags: ['internal'],
          children: [{ name: 'default.jpg', type: 'file' }],
        },
      ],
    },
    {
      name: 'teams',
      type: 'directory',
      tags: ['internal'],
      children: [
        {
          name: 'engineering',
          type: 'directory',
          tags: ['confidential'],
          children: [
            { name: 'roadmap.pdf', type: 'file' },
            { name: 'demo', type: 'directory', children: [{ name: 'walkthrough.txt', type: 'file' }] },
          ],
        },
        {
          name: 'finance',
          type: 'directory',
          tags: ['restricted'],
          children: [
            { name: 'payroll.xlsx', type: 'file' },
            { name: 'forecasts', type: 'directory', children: [{ name: 'q4.xlsx', type: 'file' }] },
          ],
        },
      ],
    },
  ],
};

const { tree: FILESYSTEM_TREE, index: FILESYSTEM_INDEX } = buildMetadata(BASE_FILESYSTEM);

export const FILESYSTEM_METADATA = FILESYSTEM_TREE;
export const FILESYSTEM_METADATA_INDEX = FILESYSTEM_INDEX;

export const getFileMetadata = (path: string): FileMetadata | undefined =>
  FILESYSTEM_METADATA_INDEX.get(normalizePath(path));

export const listFileMetadata = (): FileMetadata[] =>
  Array.from(FILESYSTEM_METADATA_INDEX.values());
