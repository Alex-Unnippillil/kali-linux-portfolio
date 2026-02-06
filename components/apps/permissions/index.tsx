import React, { useMemo, useState } from 'react';
import {
  applyMockPermissions,
  getMockFileEntries,
  getMockFileEntry,
  MockFileEntry,
  PermissionChange,
  toOctalString,
} from '../../../utils/fileSystemMock';

type Role = 'user' | 'group' | 'other';
type PermissionKey = 'read' | 'write' | 'execute';

type PermissionMatrix = Record<Role, Record<PermissionKey, boolean>>;

type OperationType = 'dry-run' | 'applied';

interface OperationSummary {
  type: OperationType;
  path: string;
  mode: string;
  recursive: boolean;
  changes: PermissionChange[];
  warnings: string[];
}

const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  group: 'Group',
  other: 'Other',
};

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  read: 'Read',
  write: 'Write',
  execute: 'Execute',
};

const ROLE_ORDER: Role[] = ['user', 'group', 'other'];
const PERMISSION_ORDER: PermissionKey[] = ['read', 'write', 'execute'];

const BIT_MAP: Record<Role, Record<PermissionKey, number>> = {
  user: {
    read: 0o400,
    write: 0o200,
    execute: 0o100,
  },
  group: {
    read: 0o40,
    write: 0o20,
    execute: 0o10,
  },
  other: {
    read: 0o4,
    write: 0o2,
    execute: 0o1,
  },
};

const modeToMatrix = (mode: number): PermissionMatrix => ({
  user: {
    read: Boolean(mode & BIT_MAP.user.read),
    write: Boolean(mode & BIT_MAP.user.write),
    execute: Boolean(mode & BIT_MAP.user.execute),
  },
  group: {
    read: Boolean(mode & BIT_MAP.group.read),
    write: Boolean(mode & BIT_MAP.group.write),
    execute: Boolean(mode & BIT_MAP.group.execute),
  },
  other: {
    read: Boolean(mode & BIT_MAP.other.read),
    write: Boolean(mode & BIT_MAP.other.write),
    execute: Boolean(mode & BIT_MAP.other.execute),
  },
});

const matrixToMode = (matrix: PermissionMatrix): number =>
  ROLE_ORDER.reduce((total, role) => {
    const permissions = PERMISSION_ORDER.reduce((sum, permission) => {
      if (matrix[role][permission]) {
        return sum + BIT_MAP[role][permission];
      }
      return sum;
    }, 0);

    return total + permissions;
  }, 0);

const matrixToSymbolic = (matrix: PermissionMatrix): string =>
  ROLE_ORDER.map((role) =>
    PERMISSION_ORDER.map((permission) =>
      matrix[role][permission]
        ? permission === 'read'
          ? 'r'
          : permission === 'write'
            ? 'w'
            : 'x'
        : '-'
    ).join('')
  ).join('');

const isDestructiveChange = (
  entry: MockFileEntry | undefined,
  newMode: number
): boolean => {
  if (!entry) {
    return false;
  }

  const ownerReadRemoved = Boolean(entry.mode & 0o400) && !(newMode & 0o400);
  const otherWriteAdded = !Boolean(entry.mode & 0o2) && Boolean(newMode & 0o2);

  return Boolean(entry.isSystem) || ownerReadRemoved || otherWriteAdded;
};

const PermissionsApp: React.FC = () => {
  const [version, setVersion] = useState(0);
  const files = useMemo(() => getMockFileEntries(), [version]);
  const [selectedPath, setSelectedPath] = useState(() => files[0]?.path ?? '');
  const [matrix, setMatrix] = useState<PermissionMatrix>(() =>
    modeToMatrix(files[0]?.mode ?? 0o644)
  );
  const [recursive, setRecursive] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [result, setResult] = useState<OperationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEntry = files.find((entry) => entry.path === selectedPath);

  const targetMode = useMemo(() => matrixToMode(matrix), [matrix]);
  const octalPreview = useMemo(() => toOctalString(targetMode), [targetMode]);
  const symbolicPreview = useMemo(() => matrixToSymbolic(matrix), [matrix]);
  const destructive = isDestructiveChange(selectedEntry, targetMode);
  const canApply = Boolean(selectedEntry) && (!destructive || confirmationInput === selectedEntry?.path);
  const canRecursive = selectedEntry?.type === 'directory';

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPath = event.target.value;
    const entry = getMockFileEntry(nextPath);

    setSelectedPath(nextPath);
    setMatrix(modeToMatrix(entry?.mode ?? 0o644));
    setRecursive(false);
    setConfirmationInput('');
    setResult(null);
    setError(null);
  };

  const handleToggle = (role: Role, permission: PermissionKey) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission],
      },
    }));
    setResult(null);
    setError(null);
  };

  const handleRecursiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRecursive(event.target.checked);
  };

  const handleOperation = (dryRun: boolean) => {
    if (!selectedEntry) {
      setError('Select a file or directory to continue.');
      return;
    }

    if (!dryRun && destructive && confirmationInput !== selectedEntry.path) {
      setError('Type the full path to confirm this change.');
      return;
    }

    try {
      const response = applyMockPermissions(selectedEntry.path, targetMode, {
        recursive,
        dryRun,
      });

      const summary: OperationSummary = {
        type: dryRun ? 'dry-run' : 'applied',
        path: selectedEntry.path,
        mode: octalPreview,
        recursive,
        changes: response.changes,
        warnings: response.warnings,
      };

      setResult(summary);
      setError(null);

      if (!dryRun) {
        setConfirmationInput('');
        setMatrix(modeToMatrix(targetMode));
        setVersion((value) => value + 1);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to change permissions.');
      }
    }
  };

  if (!files.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
        No files available.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <h1 className="text-2xl font-semibold">Permissions Manager</h1>
      <p className="mt-1 text-sm text-ubt-grey">
        Adjust simulated permissions for demo files. Changes never touch the real
        file system.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <label
            htmlFor="permission-path"
            className="block text-sm font-medium text-ubt-grey"
          >
            Target path
          </label>
          <select
            id="permission-path"
            value={selectedPath}
            onChange={handleSelectChange}
            className="mt-2 w-full rounded border border-ubt-grey bg-black bg-opacity-30 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {files.map((entry) => (
              <option key={entry.path} value={entry.path}>
                {entry.path} {entry.type === 'directory' ? '(dir)' : '(file)'}
              </option>
            ))}
          </select>
          {selectedEntry?.isSystem && (
            <p className="mt-2 text-sm text-yellow-300">
              This path is marked as a system file. Proceed carefully.
            </p>
          )}
        </section>

        <section className="rounded border border-ubt-grey bg-black bg-opacity-30 p-4">
          <h2 className="text-lg font-semibold">Permission matrix</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ROLE_ORDER.map((role) => (
              <fieldset key={role} className="rounded border border-ubt-grey p-3">
                <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-ubt-grey">
                  {ROLE_LABELS[role]}
                </legend>
                <div className="mt-2 space-y-2">
                  {PERMISSION_ORDER.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={matrix[role][permission]}
                        onChange={() => handleToggle(role, permission)}
                        className="h-4 w-4 rounded border border-ubt-grey bg-black"
                        aria-label={`${ROLE_LABELS[role]} ${PERMISSION_LABELS[permission]}`}
                      />
                      <span>{PERMISSION_LABELS[permission]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-ubt-grey">
            <span>
              Current: {selectedEntry ? toOctalString(selectedEntry.mode) : '---'}
            </span>
            <span>Octal preview: {octalPreview}</span>
            <span>Symbolic: {symbolicPreview}</span>
          </div>
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recursive && canRecursive}
              onChange={handleRecursiveChange}
              disabled={!canRecursive}
              className="h-4 w-4 rounded border border-ubt-grey bg-black"
            />
            <span>Apply recursively to nested files</span>
          </label>
          {!canRecursive && (
            <p className="text-xs text-ubt-grey">
              Recursive apply is only available for directories.
            </p>
          )}
        </section>

        {destructive && selectedEntry && (
          <section className="rounded border border-red-500 bg-red-500 bg-opacity-10 p-4 text-sm text-red-100">
            <p>
              This change could be destructive. Type
              <span className="mx-1 font-mono text-red-200">
                {selectedEntry.path}
              </span>
              to confirm.
            </p>
            <label
              htmlFor="permission-confirmation"
              className="mt-3 block text-xs uppercase tracking-wide text-red-200"
            >
              Type the path to confirm
            </label>
            <input
              id="permission-confirmation"
              type="text"
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              className="mt-1 w-full rounded border border-red-500 bg-black bg-opacity-40 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleOperation(true)}
            className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold transition hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedEntry}
          >
            Preview (dry run)
          </button>
          <button
            type="button"
            onClick={() => handleOperation(false)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canApply}
          >
            Apply changes
          </button>
        </div>

        {error && (
          <div
            className="rounded border border-red-500 bg-red-500 bg-opacity-10 p-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {result && (
          <div
            className="space-y-3 rounded border border-ubt-grey bg-black bg-opacity-30 p-4"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold">
              {result.type === 'dry-run' ? 'Dry run simulation' : 'Changes applied'}
            </h2>
            <p className="text-sm text-ubt-grey">
              {result.type === 'dry-run'
                ? `Simulated applying ${result.mode} to ${result.path}${result.recursive ? ' recursively' : ''}.`
                : `Applied ${result.mode} to ${result.path}${result.recursive ? ' recursively' : ''}.`}
            </p>
            {result.changes.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {result.changes.map((change) => (
                  <li key={change.path}>
                    {change.path}: {change.from} -&gt; {change.to}
                    {change.isSystem ? ' (system file)' : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ubt-grey">
                {result.type === 'dry-run'
                  ? 'No changes would be made.'
                  : 'No changes were necessary.'}
              </p>
            )}
            {result.warnings.length > 0 && (
              <div className="rounded border border-yellow-500 bg-yellow-500 bg-opacity-10 p-3">
                <h3 className="text-sm font-semibold text-yellow-200">Warnings</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-yellow-100">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionsApp;
