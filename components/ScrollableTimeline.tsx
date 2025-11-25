import React, { useMemo } from 'react';
import rawMilestones from '../data/milestones.json';

interface Milestone {
  date: string; // YYYY-MM or YYYY-MM-DD
  title: string;
  image: string;
  link: string;
  tags: string[];
}

interface TimelineEntry extends Milestone {
  isoDay: string;
  year: string;
  weekday: string;
  dayLabel: string;
  monthLabel: string;
}

interface TimelineSection {
  isoDay: string;
  year: string;
  weekday: string;
  dayLabel: string;
  entries: TimelineEntry[];
}

const milestones = rawMilestones as Milestone[];

const MINOR_TICK_SPACING_PX = 112;

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const ScrollableTimeline: React.FC = () => {
  const sections = useMemo(() => {
    const parsedEntries: TimelineEntry[] = milestones
      .map((milestone) => {
        const [year, month, rawDay] = milestone.date.split('-');
        const numericYear = Number(year);
        const numericMonth = Number(month) - 1;
        const numericDay = rawDay ? Number(rawDay) : 1;
        const dateObj = new Date(numericYear, numericMonth, numericDay);
        const isoDay = `${year}-${month}-${(rawDay || '01').padStart(2, '0')}`;

        return {
          ...milestone,
          isoDay,
          year,
          weekday: weekdayFormatter.format(dateObj),
          dayLabel: dayFormatter.format(dateObj),
          monthLabel: monthFormatter.format(dateObj),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const grouped = new Map<string, TimelineSection>();
    const orderedSections: TimelineSection[] = [];

    parsedEntries.forEach((entry) => {
      let section = grouped.get(entry.isoDay);
      if (!section) {
        section = {
          isoDay: entry.isoDay,
          year: entry.year,
          weekday: entry.weekday,
          dayLabel: entry.dayLabel,
          entries: [],
        };
        grouped.set(entry.isoDay, section);
        orderedSections.push(section);
      }
      section.entries.push(entry);
    });

    return orderedSections;
  }, []);

  const renderTags = (tags: string[]) => (
    <ul className="flex flex-wrap gap-2 text-xs md:text-sm text-slate-300">
      {tags.map((tag) => (
        <li key={tag} className="rounded bg-slate-800/80 px-2 py-0.5">
          #{tag}
        </li>
      ))}
    </ul>
  );

  const axisTickStyle = useMemo(
    () => ({
      backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${MINOR_TICK_SPACING_PX - 2}px, rgba(148, 163, 184, 0.35) ${MINOR_TICK_SPACING_PX - 2}px, rgba(148, 163, 184, 0.35) ${MINOR_TICK_SPACING_PX}px)`,
      backgroundRepeat: 'repeat-y',
      backgroundSize: `100% ${MINOR_TICK_SPACING_PX}px`,
    }),
    [],
  );

  return (
    <section aria-labelledby="timeline-heading" className="text-slate-100">
      <div className="mb-4">
        <h3 id="timeline-heading" className="text-xl font-semibold">
          Career timeline
        </h3>
        <p className="text-sm text-slate-400">Scroll to explore milestones grouped by day.</p>
      </div>
      <div className="relative max-h-[70vh] overflow-y-auto pr-4">
        <div
          aria-hidden
          className="pointer-events-none absolute left-8 top-0 bottom-0 w-8"
          style={axisTickStyle}
        />
        <div aria-hidden className="pointer-events-none absolute left-12 top-0 bottom-0 w-px bg-slate-600/70" />
        <ol role="list" className="relative space-y-16 pl-24">
          {sections.map((section, sectionIndex) => {
            const previousYear = sections[sectionIndex - 1]?.year;
            const showYearChip = previousYear !== section.year;

            return (
              <li key={section.isoDay} className="relative">
                {showYearChip && (
                  <div className="sticky top-0 -ml-24 mb-2 pl-24">
                    <span className="inline-flex rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 shadow">
                      {section.year}
                    </span>
                  </div>
                )}
                <header className="sticky top-8 -ml-24 z-10 mb-6 pl-24">
                  <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/95 px-3 py-1.5 text-sm font-medium text-slate-100 shadow">
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{section.weekday}</span>
                    <span>{section.dayLabel}</span>
                  </div>
                </header>
                <span
                  aria-hidden
                  className="absolute top-16 left-12 flex h-3 w-3 -translate-x-1/2 items-center justify-center"
                >
                  <span className="h-3 w-3 rounded-full border-2 border-slate-900 bg-ubt-blue shadow" />
                </span>
                <div className="space-y-6">
                  {section.entries.map((entry, entryIndex) => {
                    const entryId = `${section.isoDay}-${entryIndex}`;
                    return (
                      <article
                        key={entryId}
                        aria-labelledby={`${entryId}-title`}
                        className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-4 shadow-lg backdrop-blur"
                      >
                        <div className="flex flex-col gap-3 md:flex-row">
                          <div className="md:w-48">
                            <img
                              src={entry.image}
                              alt={entry.title}
                              className="h-32 w-full rounded-lg object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ubt-blue">
                                {entry.monthLabel}
                              </p>
                              <h4 id={`${entryId}-title`} className="text-lg font-semibold leading-tight">
                                {entry.title}
                              </h4>
                            </div>
                            <a
                              href={entry.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-ubt-blue underline"
                            >
                              Visit resource
                              <span aria-hidden>↗</span>
                            </a>
                            {renderTags(entry.tags)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default ScrollableTimeline;

