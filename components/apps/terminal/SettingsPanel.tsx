'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  TerminalColorPreset,
  TerminalColorVariant,
  TerminalThemeVariant,
} from '../../../data/terminal/colors';
import { getRampMinContrast } from '../../../utils/color/ansiContrast';

interface SettingsPanelProps {
  open: boolean;
  presets: readonly TerminalColorPreset[];
  customPreset?: TerminalColorPreset | null;
  activePresetId: string;
  activePreset: TerminalColorPreset;
  activeVariant: TerminalThemeVariant;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onExportPreset: () => Promise<string> | string;
  onImportPreset: (json: string) => Promise<string>;
  onRemoveCustom?: () => void;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const VariantPreview = ({
  label,
  variant,
  contrast,
}: {
  label: string;
  variant: TerminalColorVariant;
  contrast: number;
}) => (
  <div>
    <div className="flex items-center justify-between text-xs text-gray-300">
      <span className="font-medium text-gray-200">{label}</span>
      <span className="font-mono text-[0.65rem] text-gray-400">
        {contrast.toFixed(1)}:1 min contrast
      </span>
    </div>
    <div className="mt-1 grid grid-cols-8 gap-1" aria-hidden="true">
      {variant.palette.map((color, index) => (
        <span
          key={`${label}-${index}`}
          className="h-3 rounded"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  presets,
  customPreset,
  activePresetId,
  activePreset,
  activeVariant,
  onClose,
  onSelectPreset,
  onExportPreset,
  onImportPreset,
  onRemoveCustom,
}) => {
  const [importValue, setImportValue] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [copying, setCopying] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setImportValue('');
      setFeedback(null);
      setCopying(false);
      setImporting(false);
    }
  }, [open]);

  const allPresets = useMemo(
    () => (customPreset ? [customPreset, ...presets] : presets),
    [customPreset, presets],
  );

  if (!open) return null;

  const activeVariantData = activePreset[activeVariant];
  const activeContrast = getRampMinContrast(
    activeVariantData.palette,
    activeVariantData.background,
  );

  const handleExport = async () => {
    try {
      setCopying(true);
      const payload = await Promise.resolve(onExportPreset());
      await navigator.clipboard.writeText(payload);
      setFeedback({
        type: 'success',
        message: 'Preset JSON copied to the clipboard.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to copy preset JSON.',
      });
    } finally {
      setCopying(false);
    }
  };

  const handleImport: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const value = importValue.trim();
    try {
      setImporting(true);
      const result = await onImportPreset(value);
      setFeedback({ type: 'success', message: result });
      setImportValue('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to import preset.',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveCustom = () => {
    onRemoveCustom?.();
    setFeedback({ type: 'success', message: 'Removed imported palette.' });
  };

  const feedbackColor = feedback?.type === 'error' ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terminal-settings-title"
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-gray-950/95 p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="terminal-settings-title" className="text-lg font-semibold text-white">
              Terminal appearance
            </h2>
            <p className="mt-1 text-sm text-gray-300">
              Choose an ANSI palette that keeps WCAG AA contrast on dark and light themes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-200 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Close
          </button>
        </div>

        {feedback && (
          <div role="status" className={`mt-4 text-sm ${feedbackColor}`}>
            {feedback.message}
          </div>
        )}

        <section className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Preset library
          </h3>
          <div
            role="radiogroup"
            aria-label="Terminal color presets"
            className="mt-2 grid gap-3 md:grid-cols-2"
          >
            {allPresets.map((preset) => {
              const isActive = preset.id === activePresetId;
              const darkContrast = getRampMinContrast(
                preset.dark.palette,
                preset.dark.background,
              );
              const lightContrast = getRampMinContrast(
                preset.light.palette,
                preset.light.background,
              );
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`rounded border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/15'
                      : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{preset.name}</p>
                      <p className="mt-1 text-xs text-gray-300">{preset.description}</p>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    <VariantPreview label="Dark" variant={preset.dark} contrast={darkContrast} />
                    <VariantPreview label="Light" variant={preset.light} contrast={lightContrast} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Active preview ({activeVariant})
          </h3>
          <div className="mt-2 rounded border border-gray-800 bg-gray-900/60 p-3">
            <div
              className="rounded-md border border-gray-800"
              style={{ background: activeVariantData.background }}
            >
              <pre
                className="overflow-x-auto whitespace-pre-wrap p-3 font-mono text-sm"
                style={{ color: activeVariantData.foreground }}
              >
                <span style={{ color: activeVariantData.palette[4] }}>┌──(</span>
                <span style={{ color: activeVariantData.palette[6] }}>demo@kali</span>
                <span style={{ color: activeVariantData.palette[4] }}>)-[</span>
                <span style={{ color: activeVariantData.palette[2] }}>~/projects</span>
                <span style={{ color: activeVariantData.palette[4] }}>]</span>
                {'\n'}
                <span style={{ color: activeVariantData.palette[4] }}>└─$</span>{' '}
                <span style={{ color: activeVariantData.palette[7] }}>ls</span>
                {'\n'}
                <span style={{ color: activeVariantData.palette[1] }}>README.md</span>{'  '}
                <span style={{ color: activeVariantData.palette[3] }}>docs</span>{'  '}
                <span style={{ color: activeVariantData.palette[5] }}>scripts</span>
              </pre>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Minimum contrast in this palette: {activeContrast.toFixed(1)}:1
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Export
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Copy the active palette as JSON to share or store for later.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={copying}
              className="mt-3 inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {copying ? 'Copying…' : 'Copy preset JSON'}
            </button>
          </div>
          <form onSubmit={handleImport} className="flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Import
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Paste a preset JSON string. Supply either a presetId or a custom palette definition
              with dark and light variants.
            </p>
            <label className="mt-2 text-xs text-gray-300" htmlFor="terminal-preset-json">
              Preset JSON
            </label>
            <textarea
              id="terminal-preset-json"
              aria-label="Preset JSON"
              className="mt-1 h-28 w-full resize-none rounded border border-gray-700 bg-gray-900/80 p-2 font-mono text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              placeholder='{"presetId":"kali-contrast"}'
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={importing || !importValue.trim()}
                className="inline-flex items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-emerald-900"
              >
                {importing ? 'Importing…' : 'Import preset'}
              </button>
              {onRemoveCustom && customPreset && (
                <button
                  type="button"
                  onClick={handleRemoveCustom}
                  className="inline-flex items-center rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Remove custom preset
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default SettingsPanel;
