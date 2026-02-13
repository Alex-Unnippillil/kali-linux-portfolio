import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import rawMilestones from '../data/milestones.json';
import { observeViewport } from '../utils/viewport';

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
      (container as any).scrollTo({ left: 0 });
    }
  }, [view, selectedYear]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = itemRefs.current.filter((el): el is HTMLLIElement => el !== null);
    const uniqueNodes = Array.from(new Set(nodes));

    const unsubscribers = uniqueNodes.map((el) =>
      observeViewport(
        el,
        (entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).focus();
          }
        },
        { root: container, threshold: 0.6 },
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [view, years, monthItems]);

  const renderTags = (tags: string[]) => (
    <ul className="flex flex-wrap gap-1 text-xs md:text-sm text-gray-400">
      {tags.map((tag) => (
        <li key={tag}>#{tag}</li>
      ))}
    </ul>
  );

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
        className="overflow-x-auto snap-x snap-mandatory focus:outline-none"
        aria-labelledby="timeline-heading"
      >
        <h3 id="timeline-heading" className="sr-only">
          Timeline
        </h3>
        <ol className="flex space-x-6">
          {view === 'year'
            ? years.map((year, index) => {
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
              })
            : monthItems.map((m, index) => (
                <li
                  key={`${selectedYear}-${m.month}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  tabIndex={-1}
                  className="snap-center flex-shrink-0 w-64 p-4 bg-gray-800 rounded-lg focus:outline-none"
                >
                  <div className="text-ubt-blue font-bold text-lg mb-2">
                    {selectedYear}-{m.month}
                  </div>
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-2"
                  >
                    <img
                      src={m.image}
                      alt={m.title}
                      className="w-full h-32 object-cover mb-2 rounded"
                    />
                    <p className="text-sm md:text-base">{m.title}</p>
                  </a>
                  {renderTags(m.tags)}
                </li>
              ))}
        </ol>
      </div>
    </div>
  );
};

export default ScrollableTimeline;

