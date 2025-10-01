import React, {
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type BannerRecord = {
  host: string;
  port: number;
  protocol?: string;
  service: string;
  banner: string;
};

type BannerGroup = Record<string, BannerRecord[]>;

export const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const sanitizeBannerText = (text: string): string =>
  text.replace(CONTROL_CHAR_PATTERN, '');

const createVersionTokenPattern = () =>
  /\b(?:v?\d+(?:\.\d+)+(?:[A-Za-z0-9_-]+)?|[A-Za-z]+[-_][A-Za-z0-9._-]*\d+(?:\.\d+)*(?:[A-Za-z0-9_-]+)?)\b/g;

const buildHighlights = (
  text: string,
  query: string
): Array<{ start: number; end: number; type: 'query' | 'version' }> => {
  const ranges: Array<{ start: number; end: number; type: 'query' | 'version' }> = [];
  const lower = text.toLowerCase();
  const trimmedQuery = query.trim().toLowerCase();

  if (trimmedQuery) {
    let idx = lower.indexOf(trimmedQuery);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + trimmedQuery.length, type: 'query' });
      idx = lower.indexOf(trimmedQuery, idx + Math.max(trimmedQuery.length, 1));
    }
  }

  const versionTokenPattern = createVersionTokenPattern();
  let match: RegExpExecArray | null;
  while ((match = versionTokenPattern.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'version' });
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: typeof ranges = [];
  ranges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(range);
      return;
    }
    if (range.start >= last.end) {
      merged.push(range);
      return;
    }
    // Prefer query highlights over version ones. If overlap with same type, extend end.
    if (last.type === 'query') {
      if (range.end > last.end && range.type === last.type) {
        last.end = range.end;
      }
      return;
    }
    if (range.type === 'query') {
      merged[merged.length - 1] = range;
      return;
    }
    if (range.end > last.end) {
      last.end = range.end;
    }
  });

  return merged;
};

const renderHighlighted = (text: string, query: string): ReactNode => {
  if (!text) return null;
  const ranges = buildHighlights(text, query);
  if (ranges.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (cursor < range.start) {
      nodes.push(text.slice(cursor, range.start));
    }
    const chunk = text.slice(range.start, range.end);
    nodes.push(
      <span
        key={`${range.start}-${range.end}-${range.type}-${index}`}
        className={
          range.type === 'query'
            ? 'bg-yellow-500 text-black rounded-sm px-0.5'
            : 'bg-blue-900 text-blue-100 rounded-sm px-0.5'
        }
        data-highlight={range.type}
      >
        {chunk}
      </span>
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

const groupBanners = (banners: BannerRecord[]): BannerGroup => {
  return banners.reduce<BannerGroup>((acc, banner) => {
    const key = banner.service || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(banner);
    return acc;
  }, {});
};

interface BannersProps {
  banners: BannerRecord[];
  onCopy?: (message: string) => void;
}

const Banners: React.FC<BannersProps> = ({ banners, onCopy }) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredBanners = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    if (!value) return banners;
    return banners.filter((banner) => {
      const haystack = [
        banner.service,
        banner.banner,
        banner.host,
        banner.protocol ?? '',
        banner.port.toString()
      ]
        .join('\n')
        .toLowerCase();
      return haystack.includes(value);
    });
  }, [banners, deferredQuery]);

  const grouped = useMemo(() => groupBanners(filteredBanners), [filteredBanners]);
  const sortedServices = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const handleCopy = async (bannerText: string) => {
    const sanitized = sanitizeBannerText(bannerText);
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      onCopy?.('Clipboard unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(sanitized);
      onCopy?.('Banner copied');
    } catch (error) {
      onCopy?.('Copy failed');
    }
  };

  return (
    <section
      className="bg-ub-dark border border-gray-700 rounded-lg p-4 text-white h-full flex flex-col"
      aria-label="Service banners"
    >
      <div className="mb-3">
        <label htmlFor="banner-search" className="block text-sm font-semibold mb-1">
          Search banners
        </label>
        <input
          id="banner-search"
          className="w-full rounded border border-gray-600 bg-black p-2 text-sm text-white focus:border-ub-yellow focus:outline-none focus:ring-1 focus:ring-ub-yellow"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by service, host, port, or version"
          aria-describedby="banner-count"
        />
        <p id="banner-count" className="mt-1 text-xs text-gray-300">
          Showing {filteredBanners.length} of {banners.length} banners
        </p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {sortedServices.length === 0 && (
          <p className="text-sm text-gray-300">
            {banners.length === 0
              ? 'No banners available yet. Example data loads automatically.'
              : 'No banners match the current search.'}
          </p>
        )}
        {sortedServices.map((service) => {
          const entries = grouped[service];
          return (
            <article key={service} className="border border-gray-700 rounded">
              <header className="flex items-center justify-between border-b border-gray-700 bg-black px-3 py-2 text-sm font-semibold uppercase tracking-wide">
                <span>{renderHighlighted(service, deferredQuery)}</span>
                <span className="text-xs text-gray-400">{entries.length} banner(s)</span>
              </header>
              <ul className="divide-y divide-gray-800">
                {entries.map((banner) => (
                  <li key={`${banner.host}-${banner.port}-${banner.service}`} className="p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                      <div className="font-mono text-sm text-blue-200">
                        {renderHighlighted(
                          `${banner.host}:${banner.port}/${banner.protocol ?? 'tcp'}`,
                          deferredQuery
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(banner.banner)}
                        className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black transition hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-ub-yellow focus:ring-offset-2 focus:ring-offset-black"
                        aria-label={`Copy banner for ${banner.host}:${banner.port}`}
                      >
                        Copy banner
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-words bg-black/60 p-2 text-xs text-green-300">
                      {renderHighlighted(banner.banner, deferredQuery)}
                    </pre>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Banners;
