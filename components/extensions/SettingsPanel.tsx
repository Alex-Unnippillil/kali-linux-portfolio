'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ExtensionSettingDefinition,
  ExtensionStorage,
  ExtensionStorageError,
  createDefaultsMap,
  extensionStorage as defaultExtensionStorage,
} from '../../extensions/storage';

export interface SettingsPanelProps {
  extensionId: string;
  settings: ExtensionSettingDefinition[];
  storage?: ExtensionStorage;
  title?: string;
  description?: string;
  allowImportExport?: boolean;
  onChange?: (values: Record<string, unknown>) => void;
  onError?: (error: ExtensionStorageError) => void;
}

interface FeedbackState {
  type: 'info' | 'success' | 'error';
  message: string;
  details?: string[];
}

const errorMessage = (error: ExtensionStorageError): string => {
  switch (error.code) {
    case 'quota_exceeded':
      return 'Storage quota exceeded for this extension. Try clearing or resetting some settings.';
    case 'invalid_payload':
      return 'The provided settings data is invalid. Please check the format and try again.';
    default:
      return 'Unable to save extension settings. Please try again.';
  }
};

const coerceNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
};

const ensureString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const ensureBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
};

export default function SettingsPanel({
  extensionId,
  settings,
  storage,
  title,
  description,
  allowImportExport = true,
  onChange,
  onError,
}: SettingsPanelProps) {
  const storageInstance = useMemo<ExtensionStorage>(
    () => storage ?? defaultExtensionStorage,
    [storage]
  );

  const defaults = useMemo(
    () => createDefaultsMap(settings),
    [settings]
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const stored = storageInstance.getAll(extensionId);
    return { ...defaults, ...stored };
  });
  const [usage, setUsage] = useState<number>(() =>
    storageInstance.getUsageBytes(extensionId)
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [importText, setImportText] = useState('');
  const [exportValue, setExportValue] = useState<string | null>(null);
  const quotaBytes = storageInstance.getQuotaBytes();
  const quotaLabel = quotaBytes > 0 ? `${quotaBytes}` : 'unlimited';

  const updateValues = useCallback(
    (next: Record<string, unknown>) => {
      const merged = { ...defaults, ...next };
      setValues(merged);
      setUsage(storageInstance.getUsageBytes(extensionId));
      setFeedback((prev) =>
        prev && prev.type === 'error' ? null : prev
      );
      if (onChange) {
        onChange(merged);
      }
    },
    [defaults, extensionId, onChange, storageInstance]
  );

  const syncFromStorage = useCallback(() => {
    updateValues(storageInstance.getAll(extensionId));
  }, [extensionId, storageInstance, updateValues]);

  const handleStorageError = useCallback(
    (error: unknown) => {
      const storageError =
        error instanceof ExtensionStorageError
          ? error
          : new ExtensionStorageError('storage_unavailable', 'Unable to persist settings.', {
              cause: error,
            });
      setFeedback({
        type: 'error',
        message: errorMessage(storageError),
      });
      if (onError) {
        onError(storageError);
      }
      syncFromStorage();
    },
    [onError, syncFromStorage]
  );

  useEffect(() => {
    syncFromStorage();
  }, [extensionId, settings, storageInstance, syncFromStorage]);

  const handleBooleanChange = useCallback(
    (key: string, checked: boolean) => {
      try {
        const next = storageInstance.set(extensionId, key, checked);
        updateValues(next);
        setFeedback({ type: 'success', message: 'Setting updated.' });
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, storageInstance, updateValues]
  );

  const handleNumberChange = useCallback(
    (key: string, raw: string, fallback: number) => {
      const parsed = raw === '' ? fallback : Number(raw);
      if (raw !== '' && Number.isNaN(parsed)) {
        setFeedback({
          type: 'error',
          message: 'Please enter a valid number.',
        });
        return;
      }

      try {
        const next = storageInstance.set(extensionId, key, parsed);
        updateValues(next);
        setFeedback({ type: 'success', message: 'Setting updated.' });
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, storageInstance, updateValues]
  );

  const handleStringChange = useCallback(
    (key: string, value: string) => {
      try {
        const next = storageInstance.set(extensionId, key, value);
        updateValues(next);
        setFeedback({ type: 'success', message: 'Setting updated.' });
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, storageInstance, updateValues]
  );

  const handleSelectChange = useCallback(
    (key: string, value: string) => {
      try {
        const next = storageInstance.set(extensionId, key, value);
        updateValues(next);
        setFeedback({ type: 'success', message: 'Setting updated.' });
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, storageInstance, updateValues]
  );

  const handleReset = useCallback(
    (key: string) => {
      try {
        const next = storageInstance.reset(extensionId, [key]);
        updateValues(next);
        setFeedback({ type: 'info', message: 'Setting reset to default.' });
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, storageInstance, updateValues]
  );

  const handleResetAll = useCallback(() => {
    try {
      const cleared = storageInstance.reset(extensionId);
      updateValues(cleared);
      setFeedback({ type: 'info', message: 'All settings reset to defaults.' });
    } catch (error) {
      handleStorageError(error);
    }
  }, [extensionId, handleStorageError, storageInstance, updateValues]);

  const onImportSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!importText.trim()) {
        setFeedback({ type: 'error', message: 'Paste settings JSON to import.' });
        return;
      }

      try {
        const result = storageInstance.import(extensionId, importText, {
          allowedKeys: settings.map((setting) => setting.key),
          preserveExisting: true,
        });
        updateValues(result.applied);
        setImportText('');
        if (result.conflicts.length > 0) {
          setFeedback({
            type: 'info',
            message: 'Imported with conflicts. Existing values were kept for some keys.',
            details: result.conflicts,
          });
        } else {
          setFeedback({ type: 'success', message: 'Settings imported successfully.' });
        }
      } catch (error) {
        handleStorageError(error);
      }
    },
    [extensionId, handleStorageError, importText, settings, storageInstance, updateValues]
  );

  const handleExport = useCallback(async () => {
    const json = storageInstance.exportAsJson(extensionId);
    setExportValue(json);

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(json);
        setFeedback({ type: 'success', message: 'Settings copied to clipboard.' });
        return;
      } catch {
        // ignore clipboard errors, fallback to textarea display
      }
    }

    setFeedback({ type: 'info', message: 'Unable to copy automatically. JSON is available below for manual copy.' });
  }, [extensionId, storageInstance]);

  const renderControl = useCallback(
    (
      setting: ExtensionSettingDefinition,
      labelId: string,
      descriptionId?: string
    ) => {
      const value = values[setting.key] ?? defaults[setting.key];

      switch (setting.type) {
        case 'boolean':
          return (
            <label
              className="flex items-center gap-2 text-sm"
              htmlFor={`${extensionId}-${setting.key}`}
            >
              <input
                id={`${extensionId}-${setting.key}`}
                type="checkbox"
                className="h-4 w-4"
                checked={ensureBoolean(value, setting.defaultValue)}
                aria-describedby={descriptionId}
                aria-label={setting.label}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleBooleanChange(setting.key, event.target.checked)
                }
              />
              <span>{setting.label}</span>
            </label>
          );
        case 'number':
          return (
            <input
              id={`${extensionId}-${setting.key}`}
              type="number"
              className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-ubt-green focus:outline-none"
              value={coerceNumber(value, setting.defaultValue)}
              min={setting.min}
              max={setting.max}
              step={setting.step}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              aria-label={setting.label}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleNumberChange(setting.key, event.target.value, setting.defaultValue)
              }
            />
          );
        case 'select':
          return (
            <select
              id={`${extensionId}-${setting.key}`}
              className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-ubt-green focus:outline-none"
              value={ensureString(value) || setting.defaultValue}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              aria-label={setting.label}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleSelectChange(setting.key, event.target.value)
              }
            >
              {setting.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        case 'string':
        default:
          if (setting.multiline) {
            return (
              <textarea
                id={`${extensionId}-${setting.key}`}
                className="h-28 w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-ubt-green focus:outline-none"
                maxLength={setting.maxLength}
                value={ensureString(value)}
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                aria-label={setting.label}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  handleStringChange(setting.key, event.target.value)
                }
              />
            );
          }

          return (
            <input
              id={`${extensionId}-${setting.key}`}
              type="text"
              className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-ubt-green focus:outline-none"
              maxLength={setting.maxLength}
              value={ensureString(value)}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              aria-label={setting.label}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleStringChange(setting.key, event.target.value)
              }
            />
          );
      }
    },
    [
      defaults,
      extensionId,
      handleBooleanChange,
      handleNumberChange,
      handleSelectChange,
      handleStringChange,
      values,
    ]
  );

  return (
    <div className="space-y-4 text-white">
      {(title || description) && (
        <header>
          {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
          {description && <p className="text-sm text-gray-300/80">{description}</p>}
        </header>
      )}

      {settings.map((setting) => {
        const currentValue = values[setting.key] ?? defaults[setting.key];
        const labelId = `${extensionId}-${setting.key}-label`;
        const descriptionId = setting.description
          ? `${labelId}-description`
          : undefined;
        return (
          <section
            key={setting.key}
            className="rounded border border-white/10 bg-black/40 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 id={labelId} className="text-sm font-semibold">
                  {setting.label}
                </h3>
                {setting.description && (
                  <p
                    id={descriptionId}
                    className="text-xs text-gray-300/80"
                  >
                    {setting.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="self-start rounded border border-white/20 px-2 py-1 text-xs text-gray-200 hover:border-ubt-green hover:text-ubt-green"
                onClick={() => handleReset(setting.key)}
              >
                Reset
              </button>
            </div>
            <div className="mt-3">
              {renderControl(setting, labelId, descriptionId)}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Current value: {JSON.stringify(currentValue)}
            </p>
          </section>
        );
      })}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-400">
          Storage usage: {usage} / {quotaLabel} bytes
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 hover:border-ubt-green hover:text-ubt-green"
            onClick={handleResetAll}
          >
            Reset All
          </button>
          {allowImportExport && (
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 hover:border-ubt-green hover:text-ubt-green"
              onClick={handleExport}
            >
              Export
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            feedback.type === 'error'
              ? 'border-red-500/50 bg-red-500/10 text-red-200'
              : feedback.type === 'success'
              ? 'border-ubt-green/60 bg-ubt-green/10 text-ubt-green'
              : 'border-ub-blue/40 bg-ub-blue/10 text-ub-blue'
          }`}
        >
          <p>{feedback.message}</p>
          {feedback.details && feedback.details.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {feedback.details.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {allowImportExport && (
        <form
          className="rounded border border-white/10 bg-black/40 p-4"
          onSubmit={onImportSubmit}
        >
          <h3 className="mb-2 text-sm font-semibold">Import settings</h3>
          <p className="mb-2 text-xs text-gray-300/80">
            Paste JSON exported from another environment. Existing keys will be kept when conflicts occur.
          </p>
          <textarea
            className="h-28 w-full rounded bg-black/60 border border-white/10 px-3 py-2 text-sm focus:border-ubt-green focus:outline-none"
            value={importText}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setImportText(event.target.value)
            }
            placeholder={'{ "extensionId": "demo", "values": { ... } }'}
            aria-label="Import settings JSON payload"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="submit"
              className="rounded border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 hover:border-ubt-green hover:text-ubt-green"
            >
              Import
            </button>
          </div>
        </form>
      )}

      {allowImportExport && exportValue && (
        <div className="rounded border border-white/10 bg-black/40 p-4">
          <h3 className="mb-2 text-sm font-semibold">Exported JSON</h3>
          <pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-gray-200">
            {exportValue}
          </pre>
        </div>
      )}
    </div>
  );
}
