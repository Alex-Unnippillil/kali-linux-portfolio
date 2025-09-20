export type SmartFolderSortField = 'lastModified' | 'size' | 'name';
export type SmartFolderSortDirection = 'asc' | 'desc';

export interface SmartFolderSort {
  field: SmartFolderSortField;
  direction: SmartFolderSortDirection;
}

export interface DateFilter {
  kind: 'date';
  field: 'lastModified';
  withinDays: number;
}

export interface SizeFilter {
  kind: 'size';
  operator: 'gte' | 'lte';
  bytes: number;
}

export interface PathFilter {
  kind: 'path';
  operator: 'includes' | 'startsWith';
  value: string;
  caseSensitive?: boolean;
}

export interface DuplicateFilter {
  kind: 'duplicate';
  basis: 'name' | 'size' | 'name-and-size';
}

export type SmartFolderFilter = DateFilter | SizeFilter | PathFilter | DuplicateFilter;

export interface SmartFolderTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor?: string;
  filters: SmartFolderFilter[];
  sort?: SmartFolderSort;
  tips?: string[];
}

export interface SmartFolder extends Omit<SmartFolderTemplate, 'id'> {
  id: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

const BYTES_PER_MB = 1024 * 1024;

export const SMART_FOLDER_TEMPLATES: SmartFolderTemplate[] = [
  {
    id: 'today',
    name: 'Today',
    description: 'Files created or updated since the start of the day for quick status checks.',
    icon: '/themes/Yaru/system/user-home.png',
    accentColor: '#2dd4bf',
    filters: [
      {
        kind: 'date',
        field: 'lastModified',
        withinDays: 0,
      },
    ],
    sort: {
      field: 'lastModified',
      direction: 'desc',
    },
    tips: [
      'Adjust the day range in the editor to include yesterday or the whole week.',
      'Pair with the duplicate filter to spot files you accidentally saved twice today.',
    ],
  },
  {
    id: 'large-files',
    name: 'Large files',
    description: 'Highlights anything heavier than 50 MB so you can reclaim space fast.',
    icon: '/themes/Yaru/apps/resource-monitor.svg',
    accentColor: '#f97316',
    filters: [
      {
        kind: 'size',
        operator: 'gte',
        bytes: 50 * BYTES_PER_MB,
      },
    ],
    sort: {
      field: 'size',
      direction: 'desc',
    },
    tips: [
      'Raise the threshold for video projects or drop it to catch oversized logs.',
      'Combine with a path filter to audit just a single workspace or mount.',
    ],
  },
  {
    id: 'recent-downloads',
    name: 'Recent downloads',
    description: 'Keeps a rolling seven-day view of your Downloads folder.',
    icon: '/themes/Yaru/system/user-desktop.png',
    accentColor: '#60a5fa',
    filters: [
      {
        kind: 'path',
        operator: 'includes',
        value: 'downloads',
      },
      {
        kind: 'date',
        field: 'lastModified',
        withinDays: 7,
      },
    ],
    sort: {
      field: 'lastModified',
      direction: 'desc',
    },
    tips: [
      'Rename the folder match if you use a custom Downloads directory.',
      'Lower the day range if you review downloads every morning.',
    ],
  },
  {
    id: 'duplicates',
    name: 'Duplicates',
    description: 'Surfaces files that share the same name and size so you can consolidate copies.',
    icon: '/themes/Yaru/system/user-trash-full.png',
    accentColor: '#f472b6',
    filters: [
      {
        kind: 'duplicate',
        basis: 'name-and-size',
      },
    ],
    sort: {
      field: 'name',
      direction: 'asc',
    },
    tips: [
      'Switch the duplicate rule to name-only when you just care about clashing exports.',
      'Add a path filter to focus the audit on project folders before archiving.',
    ],
  },
];

