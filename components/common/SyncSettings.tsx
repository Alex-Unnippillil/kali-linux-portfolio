import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  buildDiffPreview,
  fetchGistSnapshot,
  updateGistSnapshot,
} from '../../services/sync/gistClient';

export interface SyncTarget {
  /** Unique identifier for this target */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** Optional helper text describing the target */
  description?: string;
  /** File name inside the gist used to store this target's snapshot */
  gistFilename: string;
  /** Returns the local snapshot to sync */
  getLocalSnapshot: () => string | Promise<string>;
  /** Applies the provided remote snapshot locally */
  applyRemoteSnapshot: (content: string) => void | Promise<void>;
}

export interface SyncSettingsProps {
  /** Available sync targets */
  targets: SyncTarget[];
  /** Optional initial gist identifier */
  gistId?: string;
  /** Optional initial GitHub personal access token */
  token?: string;
  /** Pre-selected target identifiers */
  defaultSelectedTargets?: string[];
  /** Optional CSS class for the root container */
  className?: string;
  /**
   * Optional callback fired whenever the GitHub token changes. This allows
   * parent components to persist the token elsewhere without storing it in
   * local storage by default.
   */
  onTokenChange?: (token: string) => void;
  /** Optional callback fired whenever the gist id changes */
  onGistIdChange?: (gistId: string) => void;
}

type SyncAction = 'pull' | 'push' | 'apply' | null;

interface DiffRecord {
  targetId: string;
  label: string;
  filename: string;
  diffText: string;
  hasChanges: boolean;
  remoteAvailable: boolean;
}

const formatClassName = (base: string[], extra?: string) =>
  extra ? `${base.join(' ')} ${extra}` : base.join(' ');

const ensureUniqueTargets = (targets: SyncTarget[]): SyncTarget[] => {
  const seen = new Set<string>();
  return targets.filter(target => {
    if (seen.has(target.id)) return false;
    seen.add(target.id);
    return true;
  });
};

const DEFAULT_CONTAINER_CLASSES = [
  'flex',
  'flex-col',
  'gap-4',
  'p-4',
  'bg-ub-cool-grey/70',
  'rounded-lg',
  'text-ubt-grey',
  'max-w-3xl',
];

const BUTTON_CLASSES =
  'px-3 py-2 rounded bg-ubt-blue/80 hover:bg-ubt-blue text-white transition disabled:opacity-50 disabled:cursor-not-allowed';

const FIELD_LABEL_CLASSES = 'text-sm font-semibold text-ubt-grey uppercase tracking-wide';
const FIELD_INPUT_CLASSES =
  'w-full mt-1 px-3 py-2 rounded bg-ub-cool-grey text-white border border-ubt-grey/40 focus:outline-none focus:ring-2 focus:ring-ubt-blue';

const TARGET_CARD_CLASSES =
  'border border-ubt-grey/30 rounded p-3 hover:border-ubt-blue transition flex flex-col gap-1 bg-ub-cool-grey/60';

const DIFF_CONTAINER_CLASSES =
  'border border-ubt-grey/40 rounded bg-black/60 text-sm text-ubt-grey overflow-x-auto p-3';

const STATUS_CLASSES = 'text-sm text-ubt-green';
const ERROR_CLASSES = 'text-sm text-ubt-red';

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const createSelectedInitialState = (
  targets: SyncTarget[],
  defaultSelectedTargets?: string[],
) => {
  if (defaultSelectedTargets && defaultSelectedTargets.length > 0) {
    const allowed = new Set(targets.map(target => target.id));
    return defaultSelectedTargets.filter(id => allowed.has(id));
  }
  return targets.map(target => target.id);
};

const useSyncedState = (
  initialValue: string,
  onChange: (next: string) => void,
): [string, (value: string) => void] => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const setAndNotify = useCallback(
    (next: string) => {
      setValue(next);
      onChange(next);
    },
    [onChange],
  );

  return [value, setAndNotify];
};

const safeString = (value: string | Promise<string>): Promise<string> =>
  Promise.resolve(value).then(result => (typeof result === 'string' ? result : String(result ?? '')));

const DEFAULT_ON_CHANGE: (value: string) => void = () => {};

const describeNoTargets = (count: number) =>
  count === 0
    ? 'No sync targets are available. Provide at least one target to enable syncing.'
    : undefined;

const SyncSettings: React.FC<SyncSettingsProps> = ({
  targets: providedTargets,
  gistId: initialGistId = '',
  token: initialToken = '',
  defaultSelectedTargets,
  className,
  onTokenChange = DEFAULT_ON_CHANGE,
  onGistIdChange = DEFAULT_ON_CHANGE,
}) => {
  const targets = useMemo(() => ensureUniqueTargets(providedTargets), [providedTargets]);
  const [token, setToken] = useSyncedState(initialToken, onTokenChange);
  const [gistId, setGistId] = useSyncedState(initialGistId, onGistIdChange);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    createSelectedInitialState(targets, defaultSelectedTargets),
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedTargets = useMemo(
    () => targets.filter(target => selectedSet.has(target.id)),
    [targets, selectedSet],
  );
  const [action, setAction] = useState<SyncAction>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffRecord[]>([]);
  const [pendingRemote, setPendingRemote] = useState<Record<string, string>>({});

  const tokenInputId = useId();
  const gistInputId = useId();
  const targetGroupId = useId();

  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.length > 0) return prev.filter(id => targets.some(target => target.id === id));
      return createSelectedInitialState(targets, defaultSelectedTargets);
    });
  }, [targets, defaultSelectedTargets]);

  const resetFeedback = useCallback(() => {
    setError(null);
    setStatus(null);
  }, []);

  const ensureCredentials = useCallback(() => {
    if (!token.trim() || !gistId.trim()) {
      setError('GitHub token and gist ID are required before syncing.');
      return false;
    }
    return true;
  }, [gistId, token]);

  const ensureSelection = useCallback(() => {
    if (selectedTargets.length === 0) {
      setError('Select at least one sync target.');
      return false;
    }
    return true;
  }, [selectedTargets.length]);

  const toggleTarget = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(existing => existing !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handlePush = useCallback(async () => {
    if (action) return;
    resetFeedback();
    if (!ensureCredentials() || !ensureSelection()) return;

    setAction('push');
    try {
      const files: Record<string, { content: string } | null> = {};
      for (const target of selectedTargets) {
        const snapshot = await safeString(target.getLocalSnapshot());
        files[target.gistFilename] = { content: snapshot };
      }

      if (Object.keys(files).length === 0) {
        setError('No files selected for sync.');
        return;
      }

      await updateGistSnapshot({
        gistId: gistId.trim(),
        token: token.trim(),
        files,
      });
      setStatus(
        `Pushed ${pluralize(Object.keys(files).length, 'target', 'targets')} to the gist successfully.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push changes to the gist.');
    } finally {
      setAction(null);
    }
  }, [action, ensureCredentials, ensureSelection, gistId, resetFeedback, selectedTargets, token]);

  const handlePreviewPull = useCallback(async () => {
    if (action) return;
    resetFeedback();
    setDiffs([]);
    setPendingRemote({});
    if (!ensureCredentials() || !ensureSelection()) return;

    setAction('pull');
    try {
      setStatus('Fetching remote gist contents…');
      const snapshot = await fetchGistSnapshot({
        gistId: gistId.trim(),
        token: token.trim(),
      });

      const nextDiffs: DiffRecord[] = [];
      const nextRemote: Record<string, string> = {};
      for (const target of selectedTargets) {
        const localContent = await safeString(target.getLocalSnapshot());
        const remoteFile = snapshot.files[target.gistFilename];
        const remoteAvailable = !!remoteFile;
        const remoteContent = remoteAvailable ? remoteFile.content ?? '' : '';
        const diffText = remoteAvailable
          ? buildDiffPreview({
              filename: target.gistFilename,
              localContent,
              remoteContent,
            })
          : '';
        if (remoteAvailable) {
          nextRemote[target.id] = remoteContent;
        }
        nextDiffs.push({
          targetId: target.id,
          label: target.label,
          filename: target.gistFilename,
          diffText,
          hasChanges: remoteAvailable ? localContent !== remoteContent : false,
          remoteAvailable,
        });
      }

      setDiffs(nextDiffs);
      setPendingRemote(nextRemote);

      if (nextDiffs.every(diff => !diff.remoteAvailable)) {
        setStatus('No remote data was found for the selected targets.');
      } else if (nextDiffs.some(diff => diff.hasChanges)) {
        setStatus('Review the diff preview below, then apply changes when ready.');
      } else {
        setStatus('Remote data matches your local snapshots.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gist contents.');
    } finally {
      setAction(null);
    }
  }, [action, ensureCredentials, ensureSelection, gistId, resetFeedback, selectedTargets, token]);

  const handleApplyPull = useCallback(async () => {
    if (action) return;
    resetFeedback();
    if (Object.keys(pendingRemote).length === 0) {
      setError('Preview remote changes before applying them.');
      return;
    }

    setAction('apply');
    try {
      const targetMap = new Map(targets.map(target => [target.id, target]));
      for (const [targetId, remoteContent] of Object.entries(pendingRemote)) {
        const target = targetMap.get(targetId);
        if (!target) continue;
        await target.applyRemoteSnapshot(remoteContent);
      }
      setStatus('Remote changes applied successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply remote changes.');
    } finally {
      setAction(null);
    }
  }, [action, pendingRemote, providedTargets, resetFeedback]);

  const hasTargets = targets.length > 0;
  const canApply = Object.keys(pendingRemote).length > 0;
  const containerClasses = useMemo(
    () => formatClassName(DEFAULT_CONTAINER_CLASSES, className),
    [className],
  );

  return (
    <section
      aria-label="Sync settings"
      className={containerClasses}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">GitHub Gist Sync</h2>
        <p className="text-sm text-ubt-grey/80">
          Manually push or pull snapshots between this workspace and a personal GitHub Gist. All
          operations require explicit confirmation—no automatic sync occurs.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-labelledby={targetGroupId}>
        <div className="flex flex-col">
          <label className={FIELD_LABEL_CLASSES} htmlFor={tokenInputId}>
            GitHub token
          </label>
          <input
            id={tokenInputId}
            type="password"
            className={FIELD_INPUT_CLASSES}
            value={token}
            onChange={event => setToken(event.target.value)}
            autoComplete="off"
            placeholder="ghp_…"
          />
          <p className="text-xs text-ubt-grey/70 mt-1">
            The token is only used for explicit sync actions and never stored automatically.
          </p>
        </div>
        <div className="flex flex-col">
          <label className={FIELD_LABEL_CLASSES} htmlFor={gistInputId}>
            Gist ID
          </label>
          <input
            id={gistInputId}
            type="text"
            className={FIELD_INPUT_CLASSES}
            value={gistId}
            onChange={event => setGistId(event.target.value)}
            placeholder="e.g. a1b2c3d4e5f6g7"
          />
          <p className="text-xs text-ubt-grey/70 mt-1">
            Use a secret gist to keep snapshots private. Only files listed below are modified.
          </p>
        </div>
      </div>

      <fieldset
        aria-labelledby={targetGroupId}
        className="flex flex-col gap-2"
      >
        <legend id={targetGroupId} className="text-base font-semibold text-white">
          Sync targets
        </legend>
        {!hasTargets && (
          <p className="text-sm text-ubt-grey/70">
            {describeNoTargets(targets.length) ?? 'No sync targets provided.'}
          </p>
        )}
        {targets.map(target => (
          <label key={target.id} className={TARGET_CARD_CLASSES}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedSet.has(target.id)}
                onChange={() => toggleTarget(target.id)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-white">{target.label}</span>
            </div>
            <div className="text-xs text-ubt-grey/70">
              <span className="block">
                Stored as <code className="font-mono">{target.gistFilename}</code>
              </span>
              {target.description && <span className="block mt-1">{target.description}</span>}
            </div>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePreviewPull}
          className={BUTTON_CLASSES}
          disabled={action !== null || !hasTargets}
        >
          Preview remote changes
        </button>
        <button
          type="button"
          onClick={handleApplyPull}
          className={BUTTON_CLASSES}
          disabled={action !== null || !canApply}
        >
          Apply remote changes
        </button>
        <button
          type="button"
          onClick={handlePush}
          className={BUTTON_CLASSES}
          disabled={action !== null || !hasTargets}
        >
          Push local changes
        </button>
      </div>

      {status && (
        <p role="status" className={STATUS_CLASSES}>
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className={ERROR_CLASSES}>
          {error}
        </p>
      )}

      {diffs.length > 0 && (
        <section aria-live="polite" className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-white">Diff preview</h3>
          {diffs.map(diff => (
            <article
              key={diff.targetId}
              className="flex flex-col gap-2"
              data-remote-available={diff.remoteAvailable}
            >
              <header className="flex items-center justify-between text-sm text-ubt-grey/80">
                <span className="font-semibold text-white">{diff.label}</span>
                <span className="font-mono text-xs text-ubt-grey/60">{diff.filename}</span>
              </header>
              <pre
                aria-label={`Diff for ${diff.label}`}
                className={DIFF_CONTAINER_CLASSES}
                data-has-changes={diff.hasChanges}
              >
                {!diff.remoteAvailable
                  ? 'No remote gist file found for this target.'
                  : diff.diffText
                  ? diff.diffText
                  : 'No differences detected. Remote content matches the local snapshot.'}
              </pre>
            </article>
          ))}
        </section>
      )}
    </section>
  );
};

export default SyncSettings;
