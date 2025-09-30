import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import rawMilestones from '../data/milestones.json';

interface Milestone {
  date: string; // YYYY-MM
  title: string;
  image: string;
  link: string;
  tags: string[];
}

interface GroupedMilestone extends Milestone {
  month: string;
}

const milestones = rawMilestones as Milestone[];

const ScrollableTimeline: React.FC = () => {
  const [view, setView] = useState<'year' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [density, setDensity] = useState<'all' | 'major'>('all');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const milestonesByYear = useMemo(() => {
    return milestones.reduce<Record<string, GroupedMilestone[]>>((acc, m) => {
      const [year, month] = m.date.split('-');
      const entry: GroupedMilestone = { ...m, month };
      (acc[year] = acc[year] || []).push(entry);
      return acc;
    }, {});
  }, []);

  const years = useMemo(() => Object.keys(milestonesByYear).sort(), [milestonesByYear]);

  const monthItems = useMemo(() => {
    if (!selectedYear) return [] as GroupedMilestone[];
    return milestonesByYear[selectedYear].sort((a, b) => a.month.localeCompare(b.month));
  }, [milestonesByYear, selectedYear]);

  const filteredMonthItems = useMemo(() => {
    if (density === 'all') return monthItems;

    const majorTags = new Set([
      'highlight',
      'major',
      'launch',
      'release',
      'award',
      'certification',
      'promotion',
    ]);

    const items = monthItems.filter((item, index) => {
      const hasMajorTag = item.tags.some((tag) => majorTags.has(tag.toLowerCase()));
      return hasMajorTag || index === 0;
    });

    return items.length > 0 ? items : monthItems;
  }, [density, monthItems]);

  useEffect(() => {
    const container = containerRef.current as HTMLElement | null;
    if (container && 'scrollTo' in container) {
      (container as any).scrollTo({ top: 0, left: 0 });
    }
  }, [view, selectedYear]);

  useEffect(() => {
    itemRefs.current = [];
  }, [view, years.length, filteredMonthItems.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).focus();
          }
        });
      },
      { root: container, threshold: 0.6 },
    );
    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [view, years, filteredMonthItems]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const maxScroll =
        view === 'year'
          ? container.scrollWidth - container.clientWidth
          : container.scrollHeight - container.clientHeight;

      if (maxScroll <= 0) {
        setHasOverflow(false);
        setScrollProgress(0);
        return;
      }

      setHasOverflow(true);
      const current = view === 'year' ? container.scrollLeft : container.scrollTop;
      setScrollProgress(Math.min(1, Math.max(0, current / maxScroll)));
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [view, years, filteredMonthItems]);

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat('en', { month: 'long' }), []);

  const formatMonthLabel = (year: string, month: string) => {
    if (!year) return monthFormatter.format(new Date(2000, Number(month) - 1));
    return `${monthFormatter.format(new Date(Number(year), Number(month) - 1))} ${year}`;
  };

  const extractDay = (date: string) => {
    const parts = date.split('-');
    if (parts.length === 3) return parts[2];
    return '--';
  };

  const renderTags = (tags: string[]) => (
    <ul className="flex flex-wrap gap-1 text-xs md:text-sm text-gray-400">
      {tags.map((tag) => (
        <li key={tag}>#{tag}</li>
      ))}
    </ul>
  );

  const containerClasses = [
    'focus:outline-none relative',
    view === 'year'
      ? 'overflow-x-auto snap-x snap-mandatory'
      : 'overflow-y-auto max-h-[70vh] pr-2',
  ].join(' ');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {view === 'month' && (
          <button
            type="button"
            onClick={() => {
              setView('year');
              setSelectedYear(null);
              setDensity('all');
            }}
            className="text-sm text-ubt-blue underline"
          >
            Back to years
          </button>
        )}
        <div className="text-sm">
          {view === 'year' ? 'Year view' : `${selectedYear} view`}
        </div>
        {view === 'month' && (
          <div className="flex items-center gap-2" role="group" aria-label="Timeline density">
            <button
              type="button"
              onClick={() => setDensity('all')}
              className={`rounded-full px-3 py-1 text-xs md:text-sm border ${
                density === 'all'
                  ? 'bg-ubt-blue text-white border-ubt-blue'
                  : 'border-gray-600 text-gray-200'
              }`}
              aria-pressed={density === 'all'}
            >
              All events
            </button>
            <button
              type="button"
              onClick={() => setDensity('major')}
              className={`rounded-full px-3 py-1 text-xs md:text-sm border ${
                density === 'major'
                  ? 'bg-ubt-blue text-white border-ubt-blue'
                  : 'border-gray-600 text-gray-200'
              }`}
              aria-pressed={density === 'major'}
            >
              Major only
            </button>
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className={containerClasses}
        aria-labelledby="timeline-heading"
      >
        <h3 id="timeline-heading" className="sr-only">
          Timeline
        </h3>
        {view === 'year' ? (
          <ol className="flex space-x-6 pb-4">
            {years.map((year, index) => {
              const first = milestonesByYear[year][0];
              return (
                <li
                  key={year}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  tabIndex={-1}
                  className="snap-center flex-shrink-0 w-64 p-4 bg-gray-800 rounded-lg focus:outline-none"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setView('month');
                      setSelectedYear(year);
                    }}
                    className="text-left w-full focus:outline-none"
                  >
                    <div className="text-ubt-blue font-bold text-lg mb-2">{year}</div>
                    <img
                      src={first.image}
                      alt={first.title}
                      className="w-full h-32 object-cover mb-2 rounded"
                    />
                    <p className="text-sm md:text-base mb-2">{first.title}</p>
                    {renderTags(first.tags)}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <ol className="space-y-6 pb-6">
            {filteredMonthItems.map((m, index) => (
              <li
                key={`${selectedYear}-${m.month}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                tabIndex={-1}
                className="relative rounded-lg bg-gray-800 focus:outline-none"
              >
                <header className="sticky top-0 z-10 flex items-baseline justify-between gap-4 border-b border-gray-700 bg-gray-900/80 px-4 py-2 backdrop-blur">
                  <div className="text-ubt-blue font-semibold text-lg">
                    {formatMonthLabel(selectedYear ?? '', m.month)}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Day {extractDay(m.date)}
                  </div>
                </header>
                <div className="p-4 space-y-3">
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={m.image}
                      alt={m.title}
                      className="w-full h-40 object-cover mb-3 rounded"
                    />
                    <p className="text-sm md:text-base font-medium">{m.title}</p>
                  </a>
                  {renderTags(m.tags)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {hasOverflow && (
        <div className="mt-3" aria-hidden="true">
          <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-ubt-blue transition-all duration-300"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrollableTimeline;

