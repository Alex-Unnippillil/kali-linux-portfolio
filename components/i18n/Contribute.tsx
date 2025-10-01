import { useMemo, useState } from 'react';
import { diffWords } from 'diff';
import type { Change } from 'diff';
import { ZodError } from 'zod';

import type {
  TranslationContext,
  TranslationExport,
} from './schema.mjs';
import {
  summarizeChanges,
  translationExportSchema,
} from './schema.mjs';

export type TranslationSource = {
  key: string;
  base: string;
  context: TranslationContext;
};

export type ContributeProps = {
  namespace: string;
  language: string;
  reviewer?: string;
  sources: TranslationSource[];
  initialTranslations?: Record<string, string | undefined>;
  onExport?: (payload: TranslationExport) => void;
};

type DraftMap = Record<string, string>;

type TranslationRow = TranslationSource & {
  original: string;
  draft: string;
};

function toDraftMap(
  sources: TranslationSource[],
  initialTranslations?: Record<string, string | undefined>
): DraftMap {
  return sources.reduce<DraftMap>((acc, item) => {
    const initial = initialTranslations?.[item.key] ?? '';
    acc[item.key] = initial;
    return acc;
  }, {});
}

function renderDiff(originalValue: string, draftValue: string) {
  const diff: Change[] = diffWords(originalValue ?? '', draftValue ?? '');

  return diff.map((part, index) => {
    const key = `${index}-${part.value}`;
    if (part.added) {
      return (
        <mark
          key={key}
          className="rounded bg-emerald-200 px-1 text-emerald-900 dark:bg-emerald-700 dark:text-emerald-100"
        >
          {part.value}
        </mark>
      );
    }

    if (part.removed) {
      return (
        <del
          key={key}
          className="rounded bg-rose-200 px-1 text-rose-900 dark:bg-rose-700 dark:text-rose-100"
        >
          {part.value}
        </del>
      );
    }

    return (
      <span key={key} className="text-slate-700 dark:text-slate-200">
        {part.value}
      </span>
    );
  });
}

export function Contribute({
  namespace,
  language,
  reviewer,
  sources,
  initialTranslations,
  onExport,
}: ContributeProps) {
  const [drafts, setDrafts] = useState<DraftMap>(() =>
    toDraftMap(sources, initialTranslations)
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportSummary, setExportSummary] = useState<
    ReturnType<typeof summarizeChanges> | null
  >(null);

  const rows = useMemo<TranslationRow[]>(() => {
    const initialMap = initialTranslations ?? {};
    return sources
      .map((source) => {
        return {
          ...source,
          original: initialMap[source.key] ?? '',
          draft: drafts[source.key] ?? initialMap[source.key] ?? '',
        };
      })
      .sort((a, b) => {
        if (a.context.section !== b.context.section) {
          return a.context.section.localeCompare(b.context.section);
        }

        return a.key.localeCompare(b.key);
      });
  }, [sources, drafts, initialTranslations]);

  const changedKeys = useMemo(() => {
    return rows
      .filter((row) => row.draft !== row.original)
      .map((row) => row.key);
  }, [rows]);

  const handleChange = (key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: value,
    }));
    setExportError(null);
    setExportResult(null);
    setExportSummary(null);
  };

  const handleReset = (key: string) => {
    const original = initialTranslations?.[key] ?? '';
    setDrafts((prev) => ({
      ...prev,
      [key]: original,
    }));
    setExportError(null);
    setExportResult(null);
    setExportSummary(null);
  };

  const handleExport = () => {
    const changes = rows.reduce<Record<string, { base: string; value: string; context: TranslationContext }>>(
      (acc, row) => {
        const draftValue = drafts[row.key] ?? '';
        if (draftValue === row.original) {
          return acc;
        }

        acc[row.key] = {
          base: row.base,
          value: draftValue,
          context: row.context,
        };

        return acc;
      },
      {}
    );

    const payload = {
      language,
      namespace,
      reviewer,
      generatedAt: new Date().toISOString(),
      changes,
    };

    try {
      const parsed = translationExportSchema.parse(payload);
      const json = JSON.stringify(parsed, null, 2);
      setExportResult(json);
      setExportSummary(summarizeChanges(parsed.changes));
      setExportError(null);
      onExport?.(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((issue) =>
            issue.path.length
              ? `${issue.path.join('.')}: ${issue.message}`
              : issue.message
          )
          .join('\n');
        setExportError(message || 'Unable to validate translation diff');
        setExportResult(null);
        setExportSummary(null);
        return;
      }

      setExportError('Unexpected error while creating export');
      setExportResult(null);
      setExportSummary(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Translation workbench
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Edit strings inline, review context, and export the diff for
          submission. Changes are compared against the existing translation
          values.
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              Namespace
            </dt>
            <dd className="font-mono text-slate-900 dark:text-slate-100">
              {namespace}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              Language
            </dt>
            <dd className="font-mono text-slate-900 dark:text-slate-100">
              {language}
            </dd>
          </div>
          {reviewer ? (
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">
                Reviewer
              </dt>
              <dd className="font-mono text-slate-900 dark:text-slate-100">
                {reviewer}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">
              Pending changes
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {changedKeys.length}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-6">
        {rows.map((row) => {
          const changed = row.draft !== row.original;
          return (
            <article
              key={row.key}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              data-testid={`translation-row-${row.key}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {row.key}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {row.context.section}
                  </p>
                </div>
                {changed ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                    Modified
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Synced
                  </span>
                )}
              </div>

              {row.context.description ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {row.context.description}
                </p>
              ) : null}
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Base string
                  </h3>
                  <p className="mt-1 rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {row.base}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Existing translation
                  </h3>
                  <p className="mt-1 rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {row.original || <span className="italic text-slate-400">Not provided yet</span>}
                  </p>
                </div>
              </div>

              <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Translated value
                <textarea
                  value={row.draft}
                  onChange={(event) => handleChange(row.key, event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  rows={3}
                  data-testid={`translation-input-${row.key}`}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {row.context.screenshot ? (
                  <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    Screenshot: {row.context.screenshot}
                  </span>
                ) : null}
                {row.context.notes ? (
                  <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    Notes: {row.context.notes}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleReset(row.key)}
                  className="rounded bg-slate-100 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Diff preview
                </p>
                <div
                  className="mt-1 whitespace-pre-wrap break-words"
                  data-testid={`translation-diff-${row.key}`}
                >
                  {renderDiff(row.original, drafts[row.key] ?? '')}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Export diff
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Validate and generate a JSON payload with only the changed keys.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Generate export
          </button>
        </div>
        {exportError ? (
          <p
            role="alert"
            className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/70 dark:text-rose-200"
            data-testid="translation-export-error"
          >
            {exportError}
          </p>
        ) : null}
        {exportSummary && exportSummary.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {exportSummary.length} change(s) ready
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {exportSummary.map((item) => (
                <li key={item.key} className="font-mono">
                  {item.key} → {item.value}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {exportResult ? (
          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Copy-ready JSON
            <textarea
              value={exportResult}
              readOnly
              rows={Math.min(16, 4 + exportResult.split('\n').length)}
              className="mt-1 w-full rounded border border-slate-300 bg-slate-50 p-2 font-mono text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              data-testid="translation-export-output"
            />
          </label>
        ) : null}
      </section>
    </div>
  );
}

export default Contribute;
