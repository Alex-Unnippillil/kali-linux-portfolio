export interface ModuleOption {
  name: string;
  required: boolean;
  description: string;
}

export interface ModuleMetadata {
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
  /** Relative path to the module documentation Markdown file. */
  docPath: string;
}

const MODULES: Record<string, ModuleMetadata> = {
  getsystem: {
    name: 'getsystem',
    description: 'Attempt to elevate your privilege to that of local system.',
    tags: ['privilege', 'elevation'],
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
    ],
    docPath: '/docs/modules/getsystem.md',
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
    docPath: '/docs/modules/keyscan_start.md',
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
    docPath: '/docs/modules/persistence_service.md',
  },
  hashdump: {
    name: 'hashdump',
    description: 'Dump password hashes from the SAM database.',
    tags: ['credentials', 'dump'],
    options: [
      {
        name: 'SESSION',
        required: true,
        description: 'The session to run this module on.',
      },
    ],
    docPath: '/docs/modules/hashdump.md',
  },
};

export const getModuleMetadata = (name: string): ModuleMetadata | undefined =>
  MODULES[name];

const modules: ModuleMetadata[] = Object.values(MODULES);

export default modules;
