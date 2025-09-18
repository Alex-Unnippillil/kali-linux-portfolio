"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import useOPFS from '../../../hooks/useOPFS';
import { DESKTOP_ACTIONS, DESKTOP_SHORTCUTS } from '../../screen/desktop';

type DesktopAction = {
  id: string;
  label: string;
  description: string;
  operation: string;
  args?: string[];
};

type DesktopShortcut = {
  id: string;
  combo: string;
  actionId: string;
  description: string;
};

type GestureConfig = {
  id: string;
  label: string;
  description: string;
  fingers: 3 | 4;
  category: 'swipe' | 'tap';
};

type ConflictPrompt = {
  gestureId: string;
  actionId: string;
  combos: string[];
  previousActionId: string;
};

type StatusMessage = {
  tone: 'info' | 'success' | 'error';
  message: string;
};

const ACTIONS = DESKTOP_ACTIONS as DesktopAction[];
const SHORTCUTS = DESKTOP_SHORTCUTS as DesktopShortcut[];

const GESTURES: GestureConfig[] = [
  {
    id: 'three-swipe-up',
    label: 'Three-finger swipe up',
    description: 'Reveal multitasking overlays such as the window switcher.',
    fingers: 3,
    category: 'swipe',
  },
  {
    id: 'three-swipe-down',
    label: 'Three-finger swipe down',
    description: 'Return to the last active window or the desktop.',
    fingers: 3,
    category: 'swipe',
  },
  {
    id: 'three-swipe-left',
    label: 'Three-finger swipe left',
    description: 'Great for assigning "previous" style navigation gestures.',
    fingers: 3,
    category: 'swipe',
  },
  {
    id: 'three-swipe-right',
    label: 'Three-finger swipe right',
    description: 'Ideal for next-app or forward navigation shortcuts.',
    fingers: 3,
    category: 'swipe',
  },
  {
    id: 'four-swipe-up',
    label: 'Four-finger swipe up',
    description: 'Use this for power actions like showing the applications view.',
    fingers: 4,
    category: 'swipe',
  },
  {
    id: 'four-swipe-down',
    label: 'Four-finger swipe down',
    description: 'Handy for quickly minimising or revealing windows.',
    fingers: 4,
    category: 'swipe',
  },
  {
    id: 'four-tap',
    label: 'Four-finger tap',
    description: 'Reserve for quick-launch actions such as opening settings.',
    fingers: 4,
    category: 'tap',
  },
];

const defaultAssignments: Record<string, string> = {
  'three-swipe-up': 'open-window-switcher',
  'three-swipe-down': 'focus-last-app',
  'three-swipe-left': 'cycle-apps',
  'three-swipe-right': 'cycle-apps',
  'four-swipe-up': 'toggle-all-apps',
  'four-swipe-down': 'minimize-focused',
  'four-tap': 'open-settings',
};

const PRESET_DIR = 'gestures/presets';
const EXPORT_DIR = 'gestures/exports';

const GestureCustomizer: React.FC = () => {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    () => ({ ...defaultAssignments })
  );
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [conflictPrompt, setConflictPrompt] = useState<ConflictPrompt | null>(
    null,
  );
  const [presetName, setPresetName] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [presets, setPresets] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);

  const { supported, getDir, writeFile, readFile, listFiles } = useOPFS();

  const combosByAction = useMemo(() => {
    const map: Record<string, string[]> = {};
    SHORTCUTS.forEach((shortcut) => {
      if (!map[shortcut.actionId]) {
        map[shortcut.actionId] = [];
      }
      if (!map[shortcut.actionId].includes(shortcut.combo)) {
        map[shortcut.actionId].push(shortcut.combo);
      }
    });
    return map;
  }, []);

  const actionMap = useMemo(() => {
    const map: Record<string, DesktopAction> = {};
    ACTIONS.forEach((action) => {
      map[action.id] = action;
    });
    return map;
  }, []);

  const conflictTitleId = useId();
  const conflictDescId = useId();

  const slugify = useCallback((value: string) => {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug;
  }, []);

  const refreshPresets = useCallback(async () => {
    if (!supported) return;
    try {
      const dir = await getDir(PRESET_DIR);
      if (!dir) return;
      const files = await listFiles(dir);
      const names = files
        .map((file) => file?.name)
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.replace(/\.json$/i, ''));
      names.sort((a, b) => a.localeCompare(b));
      setPresets(names);
    } catch (error) {
      console.error('Failed to list gesture presets', error);
    }
  }, [supported, getDir, listFiles]);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  useEffect(() => {
    if (selectedPreset && !presets.includes(selectedPreset)) {
      setSelectedPreset('');
    }
  }, [presets, selectedPreset]);

  const handleActionChange = useCallback(
    (gestureId: string, actionId: string) => {
      setAssignments((prev) => {
        const previousActionId = prev[gestureId] ?? '';
        if (previousActionId === actionId) {
          return prev;
        }

        const next = { ...prev, [gestureId]: actionId };
        const key = `${gestureId}:${actionId}`;
        const combos = combosByAction[actionId] ?? [];
        const wasAcknowledged = acknowledged[key];

        if (combos.length && !wasAcknowledged) {
          setConflictPrompt({
            gestureId,
            actionId,
            combos,
            previousActionId,
          });
        } else {
          setConflictPrompt(null);
        }

        return next;
      });
    },
    [acknowledged, combosByAction],
  );

  const handleKeepConflict = useCallback(() => {
    if (!conflictPrompt) return;
    const key = `${conflictPrompt.gestureId}:${conflictPrompt.actionId}`;
    setAcknowledged((prev) => ({ ...prev, [key]: true }));
    setConflictPrompt(null);
  }, [conflictPrompt]);

  const handleRevertConflict = useCallback(() => {
    if (!conflictPrompt) return;
    const { gestureId, actionId, previousActionId } = conflictPrompt;
    setAssignments((prev) => {
      const next = { ...prev };
      const fallback =
        previousActionId || defaultAssignments[gestureId] || '';
      next[gestureId] = fallback;
      return next;
    });
    setConflictPrompt(null);
  }, [conflictPrompt]);

  const handleSavePreset = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!supported) {
        setStatus({
          tone: 'error',
          message: 'OPFS is not supported in this browser. Saving is disabled.',
        });
        return;
      }
      const slug = slugify(presetName);
      if (!slug) {
        setStatus({
          tone: 'error',
          message: 'Enter a preset name before saving.',
        });
        return;
      }
      setSaving(true);
      setStatus(null);
      try {
        const dir = await getDir(PRESET_DIR);
        if (!dir) {
          throw new Error('preset directory unavailable');
        }
        const payload = JSON.stringify(
          {
            version: 1,
            savedAt: new Date().toISOString(),
            assignments,
            acknowledged,
          },
          null,
          2,
        );
        const ok = await writeFile(`${slug}.json`, payload, dir);
        if (!ok) {
          throw new Error('write failed');
        }
        setStatus({
          tone: 'success',
          message: `Saved preset "${slug}" to ${PRESET_DIR}.`,
        });
        setPresetName(slug);
        await refreshPresets();
      } catch (error) {
        console.error('Failed to save gesture preset', error);
        setStatus({
          tone: 'error',
          message:
            'Failed to save preset. Confirm storage permissions and try again.',
        });
      } finally {
        setSaving(false);
      }
    },
    [supported, slugify, presetName, getDir, assignments, acknowledged, writeFile, refreshPresets],
  );

  const handleExportPreset = useCallback(async () => {
    if (!supported) {
      setStatus({
        tone: 'error',
        message: 'OPFS is not supported in this browser. Export is disabled.',
      });
      return;
    }
    setExporting(true);
    setStatus(null);
    try {
      const dir = await getDir(EXPORT_DIR);
      if (!dir) {
        throw new Error('export directory unavailable');
      }
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .toLowerCase();
      const fileName = `gesture-layout-${timestamp}.json`;
      const payload = JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          assignments,
          acknowledged,
        },
        null,
        2,
      );
      const ok = await writeFile(fileName, payload, dir);
      if (!ok) {
        throw new Error('export write failed');
      }
      setStatus({
        tone: 'success',
        message: `Exported current layout to ${EXPORT_DIR}/${fileName}.`,
      });
    } catch (error) {
      console.error('Failed to export gesture preset', error);
      setStatus({
        tone: 'error',
        message: 'Failed to export preset to OPFS.',
      });
    } finally {
      setExporting(false);
    }
  }, [supported, getDir, assignments, acknowledged, writeFile]);

  const handleLoadPreset = useCallback(async () => {
    if (!selectedPreset) return;
    if (!supported) {
      setStatus({
        tone: 'error',
        message: 'OPFS is not supported in this browser. Loading is disabled.',
      });
      return;
    }
    setLoadingPreset(true);
    setStatus(null);
    try {
      const dir = await getDir(PRESET_DIR);
      if (!dir) {
        throw new Error('preset directory unavailable');
      }
      const contents = await readFile(`${selectedPreset}.json`, dir);
      if (!contents) {
        throw new Error('preset not found');
      }
      const parsed = JSON.parse(contents);
      if (parsed && typeof parsed === 'object') {
        const parsedAssignments =
          typeof parsed.assignments === 'object' && parsed.assignments
            ? parsed.assignments
            : {};
        setAssignments({ ...defaultAssignments, ...parsedAssignments });
        const parsedAcknowledged =
          typeof parsed.acknowledged === 'object' && parsed.acknowledged
            ? parsed.acknowledged
            : {};
        const cleaned: Record<string, boolean> = {};
        Object.keys(parsedAcknowledged).forEach((key) => {
          if (parsedAcknowledged[key]) cleaned[key] = true;
        });
        setAcknowledged(cleaned);
      }
      setConflictPrompt(null);
      setStatus({
        tone: 'success',
        message: `Loaded preset "${selectedPreset}".`,
      });
    } catch (error) {
      console.error('Failed to load gesture preset', error);
      setStatus({
        tone: 'error',
        message: `Failed to load preset "${selectedPreset}".`,
      });
    } finally {
      setLoadingPreset(false);
    }
  }, [selectedPreset, supported, getDir, readFile]);

  return (
    <div
      data-testid="gesture-customizer"
      className="h-full w-full overflow-y-auto bg-ub-cool-grey p-4 text-white"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Gesture Customizer</h1>
          <p className="text-sm text-ubt-warm-grey">
            Map three and four-finger gestures to desktop operations managed by
            the window system. Conflicts with existing keyboard shortcuts are
            detected automatically so you can decide whether to keep or adjust
            an assignment.
          </p>
          {!supported && (
            <p className="rounded bg-yellow-900/60 px-3 py-2 text-sm text-yellow-200">
              Preset storage requires a browser with Origin Private File System
              support. Gesture mappings can still be explored, but saving and
              exporting are disabled.
            </p>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Gesture assignments</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {GESTURES.map((gesture) => {
              const actionId = assignments[gesture.id] ?? '';
              const action = actionMap[actionId];
              const combos = combosByAction[actionId] ?? [];
              return (
                <div
                  key={gesture.id}
                  className="flex flex-col justify-between gap-3 rounded border border-gray-700 bg-ub-dark-grey p-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">{gesture.label}</h3>
                    <p className="text-xs text-ubt-warm-grey">
                      {gesture.description}
                    </p>
                  </div>
                  <label className="space-y-2 text-sm">
                    <span className="block font-medium">Assigned action</span>
                    <select
                      className="w-full rounded border border-gray-700 bg-ub-dark px-2 py-1 text-white"
                      value={actionId}
                      onChange={(event) =>
                        handleActionChange(gesture.id, event.target.value)
                      }
                    >
                      <option value="">No action</option>
                      {ACTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {action && (
                      <p className="text-xs text-ubt-warm-grey">
                        {action.description}
                      </p>
                    )}
                    {combos.length > 0 && (
                      <div className="space-y-1 text-xs text-orange-300">
                        <p className="font-semibold">Existing shortcuts</p>
                        <ul className="space-y-0.5">
                          {combos.map((combo) => (
                            <li key={combo}>
                              <code className="rounded bg-black/40 px-1 py-0.5">
                                {combo}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded border border-gray-700 bg-ub-dark-grey p-4">
          <h2 className="text-xl font-semibold">Presets</h2>
          <form className="space-y-3" onSubmit={handleSavePreset}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Preset name</span>
              <input
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                className="rounded border border-gray-700 bg-ub-dark px-2 py-1 text-white"
                placeholder="e.g. window-management"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded bg-ub-warm-grey px-3 py-1 text-sm font-medium text-white hover:bg-opacity-80 disabled:opacity-60"
                disabled={saving || !supported}
              >
                {saving ? 'Saving…' : 'Save preset'}
              </button>
              <button
                type="button"
                className="rounded bg-ub-warm-grey px-3 py-1 text-sm font-medium text-white hover:bg-opacity-80 disabled:opacity-60"
                onClick={handleExportPreset}
                disabled={exporting || !supported}
              >
                {exporting ? 'Exporting…' : 'Export JSON'}
              </button>
            </div>
          </form>

          <div className="space-y-2 text-sm">
            <span className="font-medium">Load saved preset</span>
            {presets.length === 0 ? (
              <p className="text-xs text-ubt-warm-grey">
                No presets saved yet. Create one above to populate this list.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded border border-gray-700 bg-ub-dark px-2 py-1 text-white"
                  value={selectedPreset}
                  onChange={(event) => setSelectedPreset(event.target.value)}
                >
                  <option value="">Choose preset…</option>
                  {presets.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded bg-ub-warm-grey px-3 py-1 text-sm font-medium text-white hover:bg-opacity-80 disabled:opacity-60"
                  onClick={handleLoadPreset}
                  disabled={loadingPreset || !selectedPreset || !supported}
                >
                  {loadingPreset ? 'Loading…' : 'Load preset'}
                </button>
              </div>
            )}
          </div>
        </section>

        {conflictPrompt && (
          <div
            role="alertdialog"
            aria-labelledby={conflictTitleId}
            aria-describedby={conflictDescId}
            className="space-y-3 rounded border border-orange-500 bg-orange-900/40 p-4 text-sm text-orange-100"
          >
            <h3 id={conflictTitleId} className="text-base font-semibold">
              Shortcut conflict detected
            </h3>
            <p id={conflictDescId}>
              The action “
              {actionMap[conflictPrompt.actionId]?.label ?? conflictPrompt.actionId}
              ” already listens to the following keyboard shortcuts:{' '}
              {conflictPrompt.combos.join(', ')}. Keep the gesture assignment or
              choose another action.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-ub-warm-grey px-3 py-1 font-medium text-white hover:bg-opacity-80"
                onClick={handleKeepConflict}
              >
                Keep action
              </button>
              <button
                type="button"
                className="rounded border border-orange-200 px-3 py-1 font-medium text-orange-100 hover:bg-orange-800/60"
                onClick={handleRevertConflict}
              >
                Choose different action
              </button>
            </div>
          </div>
        )}

        <div
          aria-live="polite"
          role="status"
          className="min-h-[1.5rem] text-sm"
        >
          {status && (
            <span
              className={
                status.tone === 'error'
                  ? 'text-red-300'
                  : status.tone === 'success'
                  ? 'text-green-300'
                  : 'text-ubt-warm-grey'
              }
            >
              {status.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestureCustomizer;

