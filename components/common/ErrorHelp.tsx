import React, { useEffect, useMemo, useState } from 'react';
import {
  ERROR_CODES,
  getAllHelpArticles,
  getErrorDefinition,
  getErrorHelpArticle,
  type ErrorCode,
  type ErrorDefinition,
  type ErrorSeverity,
  type HelpArticle,
  searchHelpArticles,
} from '../../utils/errors';

interface ErrorHelpProps {
  code: ErrorCode | string;
  message?: string;
}

const severityLabels: Record<ErrorSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
};

function formatArticleContent(article: HelpArticle): React.ReactNode {
  return article.content.map((segment, index) => {
    const trimmed = segment.trim();
    if (!trimmed) {
      return <hr key={`divider-${article.slug}-${index}`} className="border-neutral-700/70" />;
    }

    if (trimmed.startsWith('- ')) {
      const items = trimmed
        .split(/\n+/)
        .filter(Boolean)
        .map((item) => item.replace(/^[-*]\s*/, ''));
      return (
        <ul key={`list-${article.slug}-${index}`} className="ml-5 list-disc space-y-1 text-sm leading-6 text-neutral-200">
          {items.map((item, itemIndex) => (
            <li key={`list-item-${article.slug}-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed
        .split(/\n+/)
        .filter(Boolean)
        .map((item) => item.replace(/^\d+\.\s*/, ''));
      return (
        <ol key={`ordered-${article.slug}-${index}`} className="ml-5 list-decimal space-y-1 text-sm leading-6 text-neutral-200">
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${article.slug}-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ol>
      );
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={`subheading-${article.slug}-${index}`} className="text-base font-semibold text-neutral-50">
          {trimmed.replace(/^##\s+/, '')}
        </h3>
      );
    }

    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={`heading-${article.slug}-${index}`} className="text-lg font-bold text-neutral-50">
          {trimmed.replace(/^#\s+/, '')}
        </h2>
      );
    }

    return (
      <p key={`paragraph-${article.slug}-${index}`} className="text-sm leading-6 text-neutral-200">
        {trimmed}
      </p>
    );
  });
}

function ErrorSummary({ definition, message }: { definition: ErrorDefinition; message: string }) {
  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900/70 p-4 text-neutral-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">Error code</p>
          <p className="text-lg font-semibold text-sky-300">{definition.code}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Severity</p>
          <p className="text-base font-semibold text-amber-300">{severityLabels[definition.severity]}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-200">{message}</p>
    </div>
  );
}

function ArticlePanel({ article }: { article: HelpArticle }) {
  return (
    <article
      id={`knowledge-base-${article.slug}`}
      className="space-y-3 rounded-md border border-neutral-700 bg-neutral-900/50 p-4 shadow-inner"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">Knowledge base</p>
          <h2 className="text-lg font-semibold text-neutral-50">{article.title}</h2>
        </div>
        <a
          className="text-sm font-semibold text-sky-300 underline"
          href={`#knowledge-base-${article.slug}`}
        >
          View article
        </a>
      </div>
      <p className="text-sm text-neutral-200">{article.summary}</p>
      <div className="space-y-2">{formatArticleContent(article)}</div>
    </article>
  );
}

function SearchPanel({
  query,
  onQueryChange,
  onSelectArticle,
  articles,
  selectedSlug,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectArticle: (article: HelpArticle) => void;
  articles: readonly HelpArticle[];
  selectedSlug?: string | null;
}) {
  const trimmedQuery = query.trim();
  const results = useMemo(() => {
    if (!trimmedQuery) {
      return [] as HelpArticle[];
    }
    return searchHelpArticles(trimmedQuery, 8);
  }, [trimmedQuery]);

  const displayedResults = trimmedQuery ? results : articles.slice(0, 3);

  return (
    <div className="space-y-2 rounded-md border border-neutral-700 bg-neutral-900/50 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="kb-search" className="text-sm font-semibold text-neutral-100">
          Search knowledge base (offline)
        </label>
        <input
          id="kb-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by keyword or symptom"
          className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/60"
        />
      </div>
      <ul className="space-y-2" aria-live="polite">
        {trimmedQuery && displayedResults.length === 0 ? (
          <li className="text-sm text-neutral-400">No articles found. Try a different search phrase.</li>
        ) : (
          displayedResults.map((article) => {
            const isActive = selectedSlug === article.slug;
            return (
              <li key={article.slug}>
                <button
                  type="button"
                  onClick={() => onSelectArticle(article)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                    isActive
                      ? 'border-sky-400 bg-sky-900/40 text-neutral-50'
                      : 'border-neutral-700 bg-neutral-950 text-neutral-100 hover:border-sky-400/80 hover:text-neutral-50'
                  }`}
                >
                  <span className="block font-semibold">{article.title}</span>
                  <span className="mt-1 block text-xs text-neutral-300">{article.summary}</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

const ErrorHelp: React.FC<ErrorHelpProps> = ({ code, message }) => {
  const definition = useMemo(() => getErrorDefinition(code), [code]);
  const defaultArticle = useMemo(() => getErrorHelpArticle(definition.code), [definition.code]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | undefined>(defaultArticle);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fallback = getErrorHelpArticle(code);
    setSelectedArticle(fallback);
    setQuery('');
  }, [code]);

  const availableArticles = useMemo(() => getAllHelpArticles(), []);
  const displayMessage = message ?? definition.defaultMessage;

  return (
    <div className="space-y-4" data-error-code={definition.code}>
      <ErrorSummary definition={definition} message={displayMessage} />
      {selectedArticle && <ArticlePanel article={selectedArticle} />}
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        onSelectArticle={(article) => {
          setSelectedArticle(article);
          setQuery('');
        }}
        articles={availableArticles}
        selectedSlug={selectedArticle?.slug}
      />
      <p className="text-xs text-neutral-500">
        Supported error codes: {ERROR_CODES.join(', ')}
      </p>
    </div>
  );
};

export default ErrorHelp;
