'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Milestone {
  date: string;
  title: string;
  image: string;
  link: string;
  tags: string[];
}

export interface GroupedMilestone extends Milestone {
  month: string;
}

interface TimelineGroup {
  year: string;
  milestones: GroupedMilestone[];
}

interface ScrollableTimelineClientProps {
  groups: TimelineGroup[];
}

const ScrollableTimelineClient: React.FC<ScrollableTimelineClientProps> = ({ groups }) => {
  const [view, setView] = useState<'year' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const years = useMemo(() => groups.map((group) => group.year), [groups]);

  const monthItems = useMemo(() => {
    if (!selectedYear) return [] as GroupedMilestone[];
    const match = groups.find((group) => group.year === selectedYear);
    return match ? match.milestones : [];
  }, [groups, selectedYear]);

  useEffect(() => {
    const container = containerRef.current as HTMLElement | null;
    if (container && 'scrollTo' in container) {
      (container as any).scrollTo({ left: 0 });
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
        <div className="text-sm">{view === 'year' ? 'Year view' : `${selectedYear} view`}</div>
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
            ? groups.map((group, index) => {
                const first = group.milestones[0];
                if (!first) return null;
                return (
                  <li
                    key={group.year}
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
                        setSelectedYear(group.year);
                      }}
                      className="text-left w-full focus:outline-none"
                    >
                      <div className="text-ubt-blue font-bold text-lg mb-2">{group.year}</div>
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
            : monthItems.map((milestone, index) => (
                <li
                  key={`${selectedYear}-${milestone.month}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  tabIndex={-1}
                  className="snap-center flex-shrink-0 w-64 p-4 bg-gray-800 rounded-lg focus:outline-none"
                >
                  <div className="text-ubt-blue font-bold text-lg mb-2">
                    {selectedYear}-{milestone.month}
                  </div>
                  <a
                    href={milestone.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-2"
                  >
                    <img
                      src={milestone.image}
                      alt={milestone.title}
                      className="w-full h-32 object-cover mb-2 rounded"
                    />
                    <p className="text-sm md:text-base">{milestone.title}</p>
                  </a>
                  {renderTags(milestone.tags)}
                </li>
              ))}
        </ol>
      </div>
    </div>
  );
};

export default ScrollableTimelineClient;
