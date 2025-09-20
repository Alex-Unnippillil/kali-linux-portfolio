export interface DevtoolLink {
  id: string;
  label: string;
  href: string;
  description: string;
  external?: boolean;
}

export const DEVTOOLS_LINKS: DevtoolLink[] = [
  {
    id: 'popular-modules',
    label: 'Module diagnostics',
    href: '/popular-modules',
    description: 'Review module activity logs and canned run results.',
  },
  {
    id: 'module-workspace',
    label: 'Workspace inspector',
    href: '/module-workspace',
    description: 'Open the module workspace to inspect data pipelines and telemetry.',
  },
  {
    id: 'admin-messages',
    label: 'Message log viewer',
    href: '/admin/messages',
    description: 'Load stored admin messages and contact form submissions.',
  },
];
