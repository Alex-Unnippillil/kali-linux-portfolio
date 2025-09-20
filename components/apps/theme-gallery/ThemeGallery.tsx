'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import {
  BUILT_IN_THEMES,
  ThemeDefinition,
} from '../../../styles/themes';
import {
  applyAccentColor,
  applyThemeTokens,
  getContrastWarnings,
  getCustomThemes,
  removeCustomTheme,
  upsertCustomTheme,
} from '../../../utils/themeTokens';
import { createThemeArchive, parseThemeArchive } from './themeIO';

const BUILT_IN_IDS = new Set(BUILT_IN_THEMES.map((theme) => theme.metadata.id));

type Status = { type: 'success' | 'error'; message: string } | null;

type ThemeGalleryProps = {
  className?: string;
};

const formatRatio = (value: number) => value.toFixed(2);

const isCustomTheme = (theme: ThemeDefinition) => !BUILT_IN_IDS.has(theme.metadata.id);

const classNames = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(' ');

export default function ThemeGallery({ className }: ThemeGalleryProps) {
  const { theme: activeThemeId, setTheme, setAccent, accent } = useSettings();
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>(activeThemeId);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomThemes(getCustomThemes());
  }, []);

  useEffect(() => {
    setSelectedId(activeThemeId);
  }, [activeThemeId]);

  const sortedCustomThemes = useMemo(
    () =>
      [...customThemes].sort((a, b) =>
        a.metadata.name.localeCompare(b.metadata.name),
      ),
    [customThemes],
  );

  const themes = useMemo(
    () => [...BUILT_IN_THEMES, ...sortedCustomThemes],
    [sortedCustomThemes],
  );

  const fallbackTheme = BUILT_IN_THEMES[0];

  const activeTheme = useMemo(
    () => themes.find((item) => item.metadata.id === activeThemeId) ?? fallbackTheme,
    [themes, activeThemeId, fallbackTheme],
  );

  const selectedTheme = useMemo(
    () => themes.find((item) => item.metadata.id === selectedId) ?? activeTheme,
    [themes, selectedId, activeTheme],
  );

  const activeThemeRef = useRef<ThemeDefinition>(activeTheme);
  const accentRef = useRef<string>(accent);

  useEffect(() => {
    activeThemeRef.current = activeTheme;
  }, [activeTheme]);

  useEffect(() => {
    accentRef.current = accent;
  }, [accent]);

  const stopPreview = useCallback(() => {
    const fallback = activeThemeRef.current ?? fallbackTheme;
    applyThemeTokens(fallback);
    applyAccentColor(accentRef.current);
    setPreviewId(null);
  }, [fallbackTheme]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  const previewTheme = useCallback(
    (theme: ThemeDefinition | null) => {
      if (!theme) {
        stopPreview();
        return;
      }
      setPreviewId(theme.metadata.id);
      applyThemeTokens(theme, { includeAccent: true });
    },
    [stopPreview],
  );

  const showStatus = useCallback((next: Status) => {
    setStatus(next);
  }, []);

  const handleApplyTheme = useCallback(
    (theme: ThemeDefinition) => {
      setPreviewId(null);
      setTheme(theme.metadata.id, theme);
      setAccent(theme.colors.accent);
      showStatus({
        type: 'success',
        message: `Applied theme “${theme.metadata.name}”.`,
      });
    },
    [setAccent, setTheme, showStatus],
  );

  const handleExportTheme = useCallback(async (theme: ThemeDefinition) => {
    try {
      const blob = await createThemeArchive(theme);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${theme.metadata.id}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      showStatus({
        type: 'success',
        message: `Exported “${theme.metadata.name}” as ZIP.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      showStatus({ type: 'error', message });
    }
  }, [showStatus]);

  const handleShareTheme = useCallback(async (theme: ThemeDefinition) => {
    try {
      const blob = await createThemeArchive(theme);
      if (
        typeof window !== 'undefined' &&
        'navigator' in window &&
        typeof navigator.share === 'function'
      ) {
        const file = new File([blob], `${theme.metadata.id}.zip`, {
          type: 'application/zip',
        });
        if ((navigator as any).canShare?.({ files: [file] })) {
          await navigator.share({
            title: theme.metadata.name,
            text: theme.metadata.description,
            files: [file],
          });
          showStatus({
            type: 'success',
            message: `Shared “${theme.metadata.name}”.`,
          });
          return;
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${theme.metadata.id}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      showStatus({
        type: 'success',
        message: `Download ready for “${theme.metadata.name}”.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Share failed.';
      showStatus({ type: 'error', message });
    }
  }, [showStatus]);

  const handleImportTheme = useCallback(async (file: File) => {
    try {
      const parsed = await parseThemeArchive(file);
      const updated = upsertCustomTheme(parsed);
      setCustomThemes(updated);
      setSelectedId(parsed.metadata.id);
      previewTheme(parsed);
      showStatus({
        type: 'success',
        message: `Imported “${parsed.metadata.name}”. Preview before applying.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      showStatus({ type: 'error', message });
    }
  }, [previewTheme, showStatus]);

  const handleRemoveTheme = useCallback(
    (theme: ThemeDefinition) => {
      const updated = removeCustomTheme(theme.metadata.id);
      setCustomThemes(updated);
      const removingActive = theme.metadata.id === activeThemeId;
      if (theme.metadata.id === selectedId) {
        setSelectedId(removingActive ? 'default' : activeThemeId);
      }
      if (removingActive) {
        setTheme('default');
        setAccent(BUILT_IN_THEMES[0].colors.accent);
      }
      showStatus({
        type: 'success',
        message: `Removed custom theme “${theme.metadata.name}”.`,
      });
    },
    [activeThemeId, selectedId, setAccent, setTheme, showStatus],
  );

  const contrastWarnings = useMemo(
    () => getContrastWarnings(selectedTheme),
    [selectedTheme],
  );

  return (
    <section className={classNames('space-y-4', className)}>
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ubt-grey">Theme Gallery</h2>
          <p className="text-sm text-ubt-cool-grey">
            Explore accessible presets or import your own desktop themes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded bg-ub-cool-grey px-3 py-2 text-sm text-ubt-grey border border-ubt-cool-grey hover:border-ub-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
          >
            Import ZIP
          </button>
          {selectedTheme && (
            <button
              type="button"
              onClick={() => handleExportTheme(selectedTheme)}
              className="rounded bg-ub-cool-grey px-3 py-2 text-sm text-ubt-grey border border-ubt-cool-grey hover:border-ub-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Export
            </button>
          )}
          {selectedTheme && (
            <button
              type="button"
              onClick={() => handleShareTheme(selectedTheme)}
              className="rounded bg-ub-cool-grey px-3 py-2 text-sm text-ubt-grey border border-ubt-cool-grey hover:border-ub-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Share
            </button>
          )}
        </div>
      </header>

      {status && (
        <div
          role="status"
          className={classNames(
            'rounded border px-3 py-2 text-sm',
            status.type === 'error'
              ? 'border-red-500/60 bg-red-900/20 text-red-300'
              : 'border-green-500/50 bg-green-900/20 text-green-200',
          )}
        >
          {status.message}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => {
          const isSelected = selectedId === theme.metadata.id;
          const isActive = activeThemeId === theme.metadata.id;
          const isPreviewing = previewId === theme.metadata.id;
          const swatches = [
            theme.colors.background,
            theme.colors.surface,
            theme.colors.accent,
            theme.colors.text,
          ];

          return (
            <button
              key={theme.metadata.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedId(theme.metadata.id)}
              onMouseEnter={() => previewTheme(theme)}
              onMouseLeave={() => previewTheme(null)}
              onFocus={() => previewTheme(theme)}
              onBlur={() => previewTheme(null)}
              className={classNames(
                'relative flex h-full flex-col gap-3 rounded border px-4 py-3 text-left transition',
                'bg-ub-cool-grey/60 hover:border-ub-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange',
                isSelected ? 'border-ub-orange' : 'border-ubt-cool-grey/40',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ubt-cool-grey">
                    {theme.metadata.mode === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                  <h3 className="text-lg font-medium text-ubt-grey">
                    {theme.metadata.name}
                  </h3>
                  {theme.metadata.description && (
                    <p className="text-xs text-ubt-cool-grey line-clamp-2">
                      {theme.metadata.description}
                    </p>
                  )}
                </div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.colors.accentContrast,
                  }}
                >
                  {theme.metadata.tags?.[0] ?? theme.metadata.mode}
                </span>
              </div>
              <div className="flex gap-2">
                {swatches.map((color) => (
                  <span
                    key={color}
                    className="h-6 flex-1 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {(isActive || isPreviewing) && (
                <span
                  className={classNames(
                    'absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
                    isPreviewing
                      ? 'bg-yellow-500/80 text-black'
                      : 'bg-ub-orange text-black',
                  )}
                >
                  {isPreviewing ? 'Preview' : 'Active'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded border border-ubt-cool-grey/40 bg-ub-cool-grey/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-ubt-grey">{selectedTheme.metadata.name}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-ubt-cool-grey">
              <dt>Version</dt>
              <dd>{selectedTheme.metadata.version}</dd>
              <dt>Author</dt>
              <dd>{selectedTheme.metadata.attribution.author}</dd>
              {selectedTheme.metadata.attribution.source && (
                <>
                  <dt>Source</dt>
                  <dd>{selectedTheme.metadata.attribution.source}</dd>
                </>
              )}
              {selectedTheme.metadata.attribution.license && (
                <>
                  <dt>License</dt>
                  <dd>{selectedTheme.metadata.attribution.license}</dd>
                </>
              )}
            </dl>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <button
              type="button"
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black hover:bg-ub-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
              onClick={() => handleApplyTheme(selectedTheme)}
            >
              Apply Theme
            </button>
            {isCustomTheme(selectedTheme) && (
              <button
                type="button"
                onClick={() => handleRemoveTheme(selectedTheme)}
                className="text-xs text-ubt-cool-grey underline hover:text-ubt-grey"
              >
                Remove custom theme
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          {contrastWarnings.length === 0 ? (
            <p className="text-sm text-green-300">
              All contrast checks pass WCAG AA thresholds.
            </p>
          ) : (
            <div className="space-y-1 text-sm text-red-300">
              <p className="font-semibold">Contrast adjustments required:</p>
              <ul className="list-disc pl-6">
                {contrastWarnings.map((warning) => (
                  <li key={warning.pair}>
                    {warning.pair} {formatRatio(warning.value)} (needs ≥{' '}
                    {formatRatio(warning.minimum)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/zip,.zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportTheme(file);
          }
          event.target.value = '';
        }}
      />
    </section>
  );
}
