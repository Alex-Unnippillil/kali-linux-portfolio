export interface ModuleOption {
  name: string;
  required: boolean;
  description: string;
}

export type ModuleBadge = 'beta' | 'popular';

export interface ModuleMetadata {
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
  /** Optional badge to surface module status in the UI. */
  badge?: ModuleBadge;
}

const MODULES: Record<string, ModuleMetadata> = {
  getsystem: {
    name: 'getsystem',
    description: 'Attempt to elevate your privilege to that of local system.',
    tags: ['privilege', 'elevation'],
    badge: 'popular',
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
    ],
  },
  keyscan_start: {
    name: 'keyscan_start',
    description: 'Start capturing keystrokes.',
    tags: ['keylogging'],
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
    ],
  },
  persistence_service: {
    name: 'persistence_service',
    description: 'Achieve persistence by installing a service.',
    tags: ['persistence', 'service'],
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
      {
        name: 'RPORT',
        required: false,
        description: 'Remote port used for callback.',
      },
    ],
  },
  hashdump: {
    name: 'hashdump',
    description: 'Dump password hashes from the SAM database.',
    tags: ['credentials', 'dump'],
    badge: 'beta',
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
    ],
  },
};

export const getModuleMetadata = (name: string): ModuleMetadata | undefined =>
  MODULES[name];

const modules: ModuleMetadata[] = Object.values(MODULES);

export default modules;
