import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long' }),
    [],
  );

  const formatMonthName = useCallback(
    (year: string, month: string) =>
      monthFormatter.format(new Date(Number(year), Number(month) - 1, 1)),
    [monthFormatter],
  );

  const getTimeRangeLabel = useCallback(
    (year: string, items: GroupedMilestone[]) => {
      if (!items.length) return year;
      const sorted = [...items].sort((a, b) => a.month.localeCompare(b.month));
      const firstLabel = formatMonthName(year, sorted[0].month);
      const lastLabel = formatMonthName(
        year,
        sorted[sorted.length - 1].month,
      );
      return firstLabel === lastLabel
        ? `${firstLabel} ${year}`
        : `${firstLabel} to ${lastLabel} ${year}`;
    },
    [formatMonthName],
  );

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

  useEffect(() => {
    const container = containerRef.current as HTMLElement | null;
    if (container && 'scrollTo' in container) {
      (container as any).scrollTo({ top: 0, left: 0 });
    }
  }, [view, selectedYear]);

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
  }, [view, years, monthItems]);

  const renderTags = (tags: string[]) => (
    <ul className="flex flex-wrap gap-1 text-xs md:text-sm text-gray-400">
      {tags.map((tag) => (
        <li key={tag}>#{tag}</li>
      ))}
    </ul>
  );

  const resolvedSelectedYear = selectedYear ?? '';

  return (
    <div>
      <div className="flex justify-between mb-4">
        {view === 'month' && (
          <button
            type="button"
            onClick={() => {
              setView('year');
              setSelectedYear(null);
            }}
            className="text-sm text-ubt-blue underline"
          >
            Back to years
          </button>
        )}
        <div className="text-sm">
          {view === 'year' ? 'Year view' : `${selectedYear} view`}
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative max-h-[70vh] overflow-y-auto focus:outline-none px-4"
        aria-labelledby="timeline-heading"
      >
        <h3 id="timeline-heading" className="sr-only">
          Timeline
        </h3>
        <ol className="space-y-12 pb-10">
          {view === 'year'
            ? years.map((year, index) => {
                const milestonesForYear = [...milestonesByYear[year]].sort(
                  (a, b) => a.month.localeCompare(b.month),
                );
                const first = milestonesForYear[0];
                if (!first) {
                  return null;
                }
                const headerId = `timeline-section-${year}`;
                const rangeId = `timeline-range-${year}`;
                return (
                  <li
                    key={year}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    tabIndex={-1}
                    role="group"
                    aria-labelledby={`${headerId} ${rangeId}`}
                    className="relative border-t border-gray-700/60 first:border-t-0 pt-10 first:pt-4 focus:outline-none"
                  >
                    <span id={rangeId} className="sr-only">
                      {`Milestones from ${getTimeRangeLabel(year, milestonesForYear)}`}
                    </span>
                    <header
                      id={headerId}
                      className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-gray-900/80 backdrop-blur border-b border-gray-700/60 flex items-center justify-between"
                    >
                      <span className="text-ubt-blue font-bold text-lg">{year}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setView('month');
                          setSelectedYear(year);
                        }}
                        className="text-sm text-ubt-blue underline focus:outline-none"
                      >
                        View monthly milestones
                      </button>
                    </header>
                    <article className="mt-4 bg-gray-800 rounded-lg p-4 focus-within:outline-none">
                      <button
                        type="button"
                        onClick={() => {
                          setView('month');
                          setSelectedYear(year);
                        }}
                        className="block text-left w-full focus:outline-none"
                      >
                        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                          {formatMonthName(year, first.month)} {year}
                        </div>
                        <img
                          src={first.image}
                          alt={first.title}
                          className="w-full h-32 object-cover mb-2 rounded"
                        />
                        <p className="text-sm md:text-base mb-2">{first.title}</p>
                        {renderTags(first.tags)}
                      </button>
                    </article>
                  </li>
                );
              })
            : monthItems.map((m, index) => {
                const headerId = `timeline-section-${resolvedSelectedYear}-${m.month}`;
                const rangeId = `timeline-range-${resolvedSelectedYear}-${m.month}`;
                const monthLabel = `${formatMonthName(
                  resolvedSelectedYear,
                  m.month,
                )} ${resolvedSelectedYear}`;
                return (
                  <li
                    key={`${resolvedSelectedYear}-${m.month}`}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    tabIndex={-1}
                    role="group"
                    aria-labelledby={`${headerId} ${rangeId}`}
                    className="relative border-t border-gray-700/60 first:border-t-0 pt-10 first:pt-4 focus:outline-none"
                  >
                    <span id={rangeId} className="sr-only">
                      {`Milestone from ${monthLabel}`}
                    </span>
                    <header
                      id={headerId}
                      className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-gray-900/80 backdrop-blur border-b border-gray-700/60"
                    >
                      <span className="text-ubt-blue font-bold text-lg">{monthLabel}</span>
                    </header>
                    <article className="mt-4 bg-gray-800 rounded-lg p-4">
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2 focus:outline-none"
                      >
                        <img
                          src={m.image}
                          alt={m.title}
                          className="w-full h-32 object-cover mb-2 rounded"
                        />
                        <p className="text-sm md:text-base">{m.title}</p>
                      </a>
                      {renderTags(m.tags)}
                    </article>
                  </li>
                );
              })}
        </ol>
      </div>
    </div>
  );
};

export default ScrollableTimeline;

