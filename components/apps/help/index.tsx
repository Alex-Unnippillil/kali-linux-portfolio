import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { HelpIndexEntry, useHelpSearch } from '@/hooks/useHelpSearch';

marked.setOptions({ mangle: false, headerIds: false });

function formatCategoryList(categories: string[]) {
  return categories.join(', ');
}

export default function HelpApp() {
  const {
    results,
    categories,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    error,
    activeDoc,
    selectDoc,
    recents,
    clearRecents,
  } = useHelpSearch();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (!activeDoc) {
      setRenderedHtml('');
      return;
    }
    const html = DOMPurify.sanitize(marked.parse(activeDoc.markdown) as string);
    setRenderedHtml(html);
  }, [activeDoc]);

  useEffect(() => {
    resultRefs.current = resultRefs.current.slice(0, results.length);
  }, [results.length]);

  const hasResults = results.length > 0;

  const statusMessage = useMemo(() => {
    if (isLoading) return 'Loading help index…';
    if (error) return error;
    if (!hasResults && searchTerm) return 'No documents matched your search.';
    if (!hasResults) return 'No documents available.';
    return `${results.length} documents`; 
  }, [isLoading, error, hasResults, results.length, searchTerm]);

  const focusResult = (index: number) => {
    resultRefs.current[index]?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusResult(0);
    }
  };

  const handleResultKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    doc: HelpIndexEntry
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (index + 1 < results.length) {
        focusResult(index + 1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) {
        searchInputRef.current?.focus();
      } else {
        focusResult(index - 1);
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDoc(doc);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    if (category !== selectedCategory) {
      resultRefs.current[0]?.focus();
    }
  };

  return (
    <div className="h-full w-full overflow-hidden bg-ub-terminal text-gray-100">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 p-6 lg:flex-row">
        <aside className="w-full max-w-sm space-y-6 lg:w-80" aria-label="Help navigation">
          <section aria-labelledby="help-search-label" className="space-y-3">
            <h2 id="help-search-label" className="text-xl font-semibold">
              Search
            </h2>
            <label className="block text-sm text-gray-300" htmlFor="help-search-input">
              Search the knowledge base
            </label>
            <input
              id="help-search-input"
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="Search commands, docs, or guides"
              aria-describedby="help-search-status"
            />
            <p id="help-search-status" className="text-xs text-gray-400">
              {statusMessage}
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </section>

          <section aria-labelledby="help-categories-label" className="space-y-3">
            <h2 id="help-categories-label" className="text-xl font-semibold">
              Categories
            </h2>
            <div role="list" className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = category === selectedCategory;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className={`rounded-full px-3 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isActive
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    }`}
                    aria-pressed={isActive}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="help-recents-label" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="help-recents-label" className="text-xl font-semibold">
                Recently viewed
              </h2>
              {recents.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-xs text-cyan-300 hover:text-cyan-100 focus:outline-none focus:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {recents.length > 0 ? (
              <ul className="space-y-2" aria-label="Recently viewed documents">
                {recents.map((doc) => (
                  <li key={doc.slug}>
                    <button
                      type="button"
                      onClick={() => selectDoc(doc)}
                      className="w-full rounded border border-transparent bg-gray-800 px-3 py-2 text-left text-sm text-gray-100 transition hover:border-cyan-400 focus:border-cyan-400 focus:outline-none"
                    >
                      <span className="block font-medium">{doc.title}</span>
                      <span className="block text-xs text-gray-400">
                        {formatCategoryList(doc.categories)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Viewed documents appear here.</p>
            )}
          </section>
        </aside>

        <div className="flex-1 space-y-6 overflow-hidden" aria-live="polite">
          <section aria-labelledby="help-results-label" className="space-y-3">
            <h2 id="help-results-label" className="text-xl font-semibold">
              Results
            </h2>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading help index…</p>
            ) : hasResults ? (
              <ul className="space-y-3" role="list">
                {results.map((doc, index) => (
                  <li key={doc.slug}>
                    <button
                      type="button"
                      ref={(el) => (resultRefs.current[index] = el)}
                      onClick={() => selectDoc(doc)}
                      onKeyDown={(event) => handleResultKeyDown(event, index, doc)}
                      className={`w-full rounded border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        activeDoc?.slug === doc.slug
                          ? 'border-cyan-500 bg-gray-800'
                          : 'border-gray-700 bg-gray-900 hover:border-cyan-400'
                      }`}
                      aria-current={activeDoc?.slug === doc.slug ? 'true' : undefined}
                    >
                      <h3 className="text-lg font-semibold text-cyan-100">{doc.title}</h3>
                      <p className="mt-1 text-sm text-gray-300">{doc.excerpt}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                        {formatCategoryList(doc.categories)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No matching documents.</p>
            )}
          </section>

          <section aria-labelledby="help-document-label" className="h-full overflow-auto rounded border border-gray-700 bg-gray-900 p-4">
            <h2 id="help-document-label" className="text-xl font-semibold text-cyan-100">
              {activeDoc ? activeDoc.title : 'Select a document'}
            </h2>
            {activeDoc ? (
              <article
                aria-label={activeDoc.title}
                className="prose prose-invert mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <p className="mt-2 text-sm text-gray-300">
                Use the search and filters to find documentation. Selected content appears in this panel.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
