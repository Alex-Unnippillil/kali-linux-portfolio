export type BackupPresetId = 'home' | 'settings' | 'workspaces';

export interface BackupPreset {
  id: BackupPresetId;
  label: string;
  description: string;
  includes: string[];
  recommended: string;
  scheduleTip: string;
}

export interface RestorePoint {
  id: string;
  preset: BackupPresetId;
  label: string;
  createdAt: string;
  size: string;
  summary: string;
}

export interface BackupFile {
  path: string;
  size: number;
  checksum: string;
  modified: string;
}

export interface VerificationResult {
  file: BackupFile;
  expected: string;
  actual: string;
  ok: boolean;
}

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

export const BACKUP_PRESETS: BackupPreset[] = [
  {
    id: 'home',
    label: 'Home directories',
    description:
      'Dotfiles, SSH keys, and personal documents captured from the primary user profile.',
    includes: ['~/.ssh/', '~/.config/', '~/Documents/', '~/Desktop/'],
    recommended: 'Nightly · full snapshot',
    scheduleTip: 'Nightly at 02:00 retains shell history and keys for two weeks.',
  },
  {
    id: 'settings',
    label: 'Settings profiles',
    description:
      'Desktop preferences, accessibility tweaks, and simulated application profiles.',
    includes: ['~/.config/gnome/', '~/.local/share/', '~/Library/Application Support/'],
    recommended: 'Daily · incremental',
    scheduleTip: 'Daily at 01:00 keeps a rolling 10 day history of UI tweaks.',
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    description:
      'Project directories, captured demos, and workspace metadata for incident rehearsals.',
    includes: ['/workspaces/redteam/', '/workspaces/labs/', '/srv/katas/'],
    recommended: 'Weekly · staged sync',
    scheduleTip: 'Weekly on Friday after close of business keeps five lab checkpoints.',
  },
];

const RESTORE_POINTS: RestorePoint[] = [
  {
    id: 'home-2024-05-18-full',
    preset: 'home',
    label: '2024-05-18 • Dotfiles baseline',
    createdAt: '2024-05-18T02:10:00Z',
    size: '3.4 GB',
    summary: 'Full snapshot prior to Capture the Flag training weekend.',
  },
  {
    id: 'home-2024-05-12-incremental',
    preset: 'home',
    label: '2024-05-12 • Incremental patch',
    createdAt: '2024-05-12T02:05:00Z',
    size: '640 MB',
    summary: 'Incremental update capturing shell aliases and bookmarks.',
  },
  {
    id: 'home-2024-05-05-full',
    preset: 'home',
    label: '2024-05-05 • Post-upgrade',
    createdAt: '2024-05-05T01:58:00Z',
    size: '3.2 GB',
    summary: 'Baseline after desktop wallpaper refresh and analytics toggle.',
  },
  {
    id: 'settings-2024-05-19-lab',
    preset: 'settings',
    label: '2024-05-19 • Lab profile sync',
    createdAt: '2024-05-19T01:15:00Z',
    size: '220 MB',
    summary: 'Accessibility tweaks and keyboard remaps captured after usability testing.',
  },
  {
    id: 'settings-2024-05-11-stable',
    preset: 'settings',
    label: '2024-05-11 • Stable baseline',
    createdAt: '2024-05-11T01:05:00Z',
    size: '215 MB',
    summary: 'Reference snapshot with telemetry disabled and dark theme applied.',
  },
  {
    id: 'workspaces-2024-05-17-sync',
    preset: 'workspaces',
    label: '2024-05-17 • Workbench sync',
    createdAt: '2024-05-17T22:45:00Z',
    size: '6.8 GB',
    summary: 'Weekly sync after automation dry run. Ready for restore tests.',
  },
  {
    id: 'workspaces-2024-05-10-drift',
    preset: 'workspaces',
    label: '2024-05-10 • Canary (checksum drift)',
    createdAt: '2024-05-10T22:40:00Z',
    size: '6.7 GB',
    summary: 'Flagged during lab audit due to checksum mismatches in report artifacts.',
  },
];

const PRESET_FILES: Record<BackupPresetId, BackupFile[]> = {
  home: [
    {
      path: '~/.ssh/id_ed25519',
      size: 4096,
      checksum: 'a4d2f1c8b3e90a7d',
      modified: '2024-05-18T01:55:00Z',
    },
    {
      path: '~/.config/gnome/settings.json',
      size: 18342,
      checksum: 'd871efcb12890c55',
      modified: '2024-05-18T01:40:00Z',
    },
    {
      path: '~/Documents/notes/incident-playbook.md',
      size: 125_829,
      checksum: '51f73ccaa4d901fd',
      modified: '2024-05-18T01:20:00Z',
    },
  ],
  settings: [
    {
      path: '~/.config/accessibility/contrast.json',
      size: 4820,
      checksum: 'c5f4b0de0973aa1f',
      modified: '2024-05-19T00:40:00Z',
    },
    {
      path: '~/.local/share/gnome-shell/extensions/layout.json',
      size: 3210,
      checksum: '9ab173dd0a146ec2',
      modified: '2024-05-19T00:35:00Z',
    },
    {
      path: '~/.config/input-methods/workbench.json',
      size: 2750,
      checksum: 'b74129decc107f42',
      modified: '2024-05-19T00:30:00Z',
    },
  ],
  workspaces: [
    {
      path: '/workspaces/redteam/report.md',
      size: 982_330,
      checksum: 'fa3e418c991002aa',
      modified: '2024-05-17T22:20:00Z',
    },
    {
      path: '/workspaces/labs/session-recording.mp4',
      size: 4_560_000,
      checksum: '0a7dfc1299bb0e44',
      modified: '2024-05-17T22:10:00Z',
    },
    {
      path: '/srv/katas/terraform/plan.tfstate',
      size: 245_760,
      checksum: 'd43c99a117eed342',
      modified: '2024-05-17T22:00:00Z',
    },
  ],
};

const CHECKSUM_DRIFT: Record<string, Array<{ path: string; actual: string }>> = {
  'workspaces-2024-05-10-drift': [
    { path: '/workspaces/redteam/report.md', actual: '000000000000dead' },
  ],
};

export const listRestorePoints = (preset: BackupPresetId) =>
  RESTORE_POINTS.filter((point) => point.preset === preset).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const enumeratePresetFiles = async (preset: BackupPresetId) => {
  await delay();
  return PRESET_FILES[preset].map((file) => ({ ...file }));
};

export const verifyRestorePoint = async (
  point: RestorePoint,
  files: BackupFile[],
): Promise<VerificationResult[]> => {
  await delay();
  const drift = CHECKSUM_DRIFT[point.id] ?? [];
  return files.map((file) => {
    const mismatch = drift.find((entry) => entry.path === file.path);
    const actual = mismatch?.actual ?? file.checksum;
    return {
      file,
      expected: file.checksum,
      actual,
      ok: actual === file.checksum,
    };
  });
};
