import React, { useEffect, useMemo, useState } from 'react';
import {
  applyRedactions,
  buildPlaceholderRegex,
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
  getPlaceholder,
  scanSensitiveMatches,
  type RedactionCategory,
  type RedactionMatch,
} from '../../utils/redaction';
import { logRedactionAudit } from '../../utils/auditLog';

const DEFAULT_CATEGORY_IDS = CATEGORY_DEFINITIONS.map(
  (definition) => definition.id,
);

interface RedactionPreviewProps {
  content: string;
  categories?: RedactionCategory[];
  context?: string;
  onChange?: (redacted: string, activeCategories: RedactionCategory[]) => void;
}

interface Segment {
  text: string;
  highlight?: boolean;
  category?: RedactionCategory;
}

const createSegments = (text: string, matches: RedactionMatch[]): Segment[] => {
  if (!matches.length) return [{ text }];
  const segments: Segment[] = [];
  let cursor = 0;
  matches.forEach((match) => {
    if (cursor < match.start) {
      segments.push({ text: text.slice(cursor, match.start) });
    }
    segments.push({
      text: text.slice(match.start, match.end),
      highlight: true,
      category: match.category,
    });
    cursor = match.end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
};

const createRedactedSegments = (
  text: string,
  categories: RedactionCategory[],
): Segment[] => {
  if (!text) return [{ text: '' }];
  const regex = buildPlaceholderRegex(categories);
  if (!regex.source || regex.source === '$^') return [{ text }];
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const value = match[0];
    const offset = match.index ?? 0;
    if (offset > lastIndex) {
      segments.push({ text: text.slice(lastIndex, offset) });
    }
    const category = categories.find(
      (candidate) => getPlaceholder(candidate) === value,
    );
    segments.push({ text: value, highlight: true, category });
    lastIndex = offset + value.length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments;
};

const CATEGORY_COLORS: Record<RedactionCategory, string> = {
  ip: 'bg-purple-700/60',
  email: 'bg-emerald-700/60',
  domain: 'bg-blue-700/60',
};

const RedactionPreview: React.FC<RedactionPreviewProps> = ({
  content,
  categories = DEFAULT_CATEGORY_IDS,
  context = 'export',
  onChange,
}) => {
  const categoryList = useMemo(
    () => CATEGORY_DEFINITIONS.filter((definition) => categories.includes(definition.id)),
    [categories],
  );

  const [active, setActive] = useState<Set<RedactionCategory>>(
    () => new Set(categoryList.map((definition) => definition.id)),
  );
  const [peekCategory, setPeekCategory] = useState<RedactionCategory | null>(null);

  const categoryKey = useMemo(
    () => categoryList.map((definition) => definition.id).join('|'),
    [categoryList],
  );

  useEffect(() => {
    setActive(new Set(categoryList.map((definition) => definition.id)));
  }, [categoryKey, categoryList]);

  const matches = useMemo(() => scanSensitiveMatches(content), [content]);

  const activeCategories = useMemo(
    () => categoryList.map((definition) => definition.id).filter((id) => active.has(id)),
    [active, categoryList],
  );

  const redactedResult = useMemo(
    () => applyRedactions(content, activeCategories, matches),
    [content, activeCategories, matches],
  );

  useEffect(() => {
    onChange?.(redactedResult.text, activeCategories);
  }, [redactedResult.text, activeCategories, onChange]);

  const toggleCategory = (category: RedactionCategory, shouldRedact: boolean) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (shouldRedact) {
        next.add(category);
        logRedactionAudit({ type: 'redaction', category, action: 'redact', context });
        return next;
      }
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(
            `Reveal ${getCategoryDefinition(category).label}? This exposes sensitive data until re-enabled.`,
          )
        : true;
      if (!confirmed) return prev;
      next.delete(category);
      logRedactionAudit({ type: 'redaction', category, action: 'reveal', context });
      return next;
    });
  };

  const handleRevealOnce = (category: RedactionCategory) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(
          `Reveal ${getCategoryDefinition(category).label} for a short time?`,
        )
      : true;
    if (!confirmed) return;
    setPeekCategory(category);
    logRedactionAudit({ type: 'redaction', category, action: 'peek', context });
  };

  const originalSegments = useMemo(() => createSegments(content, matches), [content, matches]);
  const redactedSegments = useMemo(
    () => createRedactedSegments(redactedResult.text, Array.from(new Set(activeCategories))),
    [redactedResult.text, activeCategories],
  );

  const peekValues = useMemo(() => {
    if (!peekCategory) return [] as string[];
    return matches
      .filter((match) => match.category === peekCategory)
      .map((match) => match.value)
      .filter((value, index, array) => array.indexOf(value) === index);
  }, [matches, peekCategory]);

  return (
    <section className="space-y-3" aria-label="Redaction preview">
      <div className="space-y-2">
        {categoryList.map((definition) => {
          const matchCount = matches.filter((match) => match.category === definition.id).length;
          const isChecked = active.has(definition.id);
          const hasMatches = matchCount > 0;
          return (
            <div key={definition.id} className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => toggleCategory(definition.id, event.target.checked)}
                  aria-label={`Toggle redaction for ${definition.label}`}
                />
                <span>{`Redact ${definition.label}`}</span>
              </label>
              <span className="text-xs text-gray-400">
                {hasMatches ? `${matchCount} match${matchCount === 1 ? '' : 'es'}` : 'No matches'}
              </span>
              <button
                type="button"
                className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-40"
                onClick={() => handleRevealOnce(definition.id)}
                disabled={!hasMatches}
                aria-label={`Reveal ${definition.label} once`}
              >
                Reveal once
              </button>
            </div>
          );
        })}
      </div>
      {peekCategory && peekValues.length > 0 && (
        <div className="rounded border border-yellow-500/60 bg-yellow-900/40 p-3" role="status">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">
              Revealed {getCategoryDefinition(peekCategory).label}
            </p>
            <button
              type="button"
              onClick={() => setPeekCategory(null)}
              className="text-xs underline"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-2 text-xs space-y-1">
            {peekValues.map((value) => (
              <li key={value} className="break-all">
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold mb-1">Original</h3>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded border border-gray-700 bg-black/60 p-3 text-xs">
            {originalSegments.map((segment, index) => (
              <span
                key={`orig-${index}`}
                className={segment.highlight && segment.category ? CATEGORY_COLORS[segment.category] : undefined}
              >
                {segment.text}
              </span>
            ))}
          </pre>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Redacted preview</h3>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded border border-gray-700 bg-black/60 p-3 text-xs">
            {redactedSegments.map((segment, index) => (
              <span
                key={`red-${index}`}
                className={segment.highlight && segment.category ? CATEGORY_COLORS[segment.category] : undefined}
              >
                {segment.text}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
};

export default RedactionPreview;
