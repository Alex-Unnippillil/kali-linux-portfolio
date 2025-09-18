export type MockFileType = 'file' | 'directory';

export interface MockFileEntry {
  path: string;
  mode: number;
  type: MockFileType;
  isSystem?: boolean;
}

export interface PermissionChange {
  path: string;
  from: string;
  to: string;
  isSystem: boolean;
}

export interface PermissionResult {
  changes: PermissionChange[];
  warnings: string[];
}

export interface ApplyPermissionOptions {
  recursive?: boolean;
  dryRun?: boolean;
}

const cloneEntry = (entry: MockFileEntry): MockFileEntry => ({
  path: entry.path,
  mode: entry.mode,
  type: entry.type,
  isSystem: entry.isSystem ?? false,
});

const initialFileSystem: MockFileEntry[] = [
  { path: '/home/demo', mode: 0o750, type: 'directory' },
  { path: '/home/demo/scripts', mode: 0o755, type: 'directory' },
  { path: '/home/demo/scripts/deploy.sh', mode: 0o744, type: 'file' },
  { path: '/var/log/app.log', mode: 0o640, type: 'file' },
  { path: '/etc/passwd', mode: 0o644, type: 'file', isSystem: true },
  { path: '/usr/bin/nmap', mode: 0o755, type: 'file', isSystem: true },
];

let fileSystemState: MockFileEntry[] = initialFileSystem.map(cloneEntry);

const withTrailingSlash = (path: string): string =>
  path.endsWith('/') ? path : `${path}/`;

const findEntry = (path: string): MockFileEntry | undefined =>
  fileSystemState.find((entry) => entry.path === path);

const getDescendants = (path: string): MockFileEntry[] => {
  const prefix = withTrailingSlash(path);
  return fileSystemState.filter(
    (entry) => entry.path !== path && entry.path.startsWith(prefix)
  );
};

export const toOctalString = (mode: number): string =>
  mode.toString(8).padStart(3, '0');

export const resetMockFileSystem = (): void => {
  fileSystemState = initialFileSystem.map(cloneEntry);
};

export const getMockFileEntries = (): MockFileEntry[] =>
  fileSystemState.map(cloneEntry);

export const getMockFileEntry = (path: string): MockFileEntry | undefined => {
  const entry = findEntry(path);
  return entry ? cloneEntry(entry) : undefined;
};

export const applyMockPermissions = (
  path: string,
  mode: number,
  options: ApplyPermissionOptions = {}
): PermissionResult => {
  const entry = findEntry(path);
  if (!entry) {
    throw new Error(`Path not found: ${path}`);
  }

  const affected: MockFileEntry[] = [entry];

  if (options.recursive && entry.type === 'directory') {
    affected.push(...getDescendants(path));
  }

  const modeString = toOctalString(mode);
  const changes: PermissionChange[] = [];
  const warnings = new Set<string>();

  affected.forEach((item) => {
    if (item.mode !== mode) {
      changes.push({
        path: item.path,
        from: toOctalString(item.mode),
        to: modeString,
        isSystem: Boolean(item.isSystem),
      });
    }

    if (item.isSystem) {
      warnings.add(`${item.path} is marked as a system file.`);
    }
  });

  if (!options.dryRun) {
    affected.forEach((item) => {
      item.mode = mode;
    });
  }

  return {
    changes,
    warnings: Array.from(warnings),
  };
};
