import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';

type ContributionDay = {
  date: string;
  count: number;
  level: number;
};

type ContributionResponse = {
  contributions: ContributionDay[];
  total: Record<string, number>;
};

type Props = {
  username: string;
  year: number;
};

const CELL_SIZE = 'clamp(9px, 1.6vw, 12px)';
const CELL_GAP = 'clamp(2px, 0.5vw, 3px)';
const levelClasses = [
  'bg-[color:var(--kali-overlay)] border border-[color:var(--kali-border)]',
  'bg-emerald-900',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-300',
];

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function GitHubContributionHeatmap({ username, year }: Props) {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [data, setData] = useState<ContributionResponse | null>(
    isTestEnv ? { contributions: [], total: {} } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isTestEnv);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    day: ContributionDay;
    position: { left: number; top: number };
  } | null>(null);

  useEffect(() => {
    if (isTestEnv) {
      return () => {};
    }
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${username}?y=${year}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to load contributions');
        }

        const json: ContributionResponse = await response.json();
        if (!controller.signal.aborted) {
          setData(json);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch contribution data', err);
          setError('Unable to load contribution data right now.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [username, year, isTestEnv]);

  const {
    weeks,
    monthLabelMap,
    totalSoFar,
    projectedTotal,
    totalForYear,
  } = useMemo(() => {
    const empty = {
      weeks: [] as (ContributionDay | null)[][],
      monthLabelMap: new Map<number, string>(),
      totalSoFar: 0,
      projectedTotal: 0,
      totalForYear: 0,
    };

    if (!data || data.contributions.length === 0) {
      return empty;
    }

    const contributions = data.contributions;
    const paddedDays: (ContributionDay | null)[] = [];

    const firstDate = new Date(`${contributions[0].date}T00:00:00`);
    for (let i = 0; i < firstDate.getDay(); i += 1) {
      paddedDays.push(null);
    }

    contributions.forEach((day) => {
      paddedDays.push(day);
    });

    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    const weeks: (ContributionDay | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weeks.push(paddedDays.slice(i, i + 7));
    }

    const monthLabelMap = new Map<number, string>();
    const seenMonths = new Set<number>();

    paddedDays.forEach((day, index) => {
      if (!day) {
        return;
      }
      const parsed = new Date(`${day.date}T00:00:00`);
      if (parsed.getDate() === 1 && !seenMonths.has(parsed.getMonth())) {
        const weekIndex = Math.floor(index / 7);
        monthLabelMap.set(
          weekIndex,
          parsed.toLocaleString(undefined, { month: 'short' })
        );
        seenMonths.add(parsed.getMonth());
      }
    });

    const totalForYear = contributions.reduce(
      (sum, day) => sum + day.count,
      0
    );

    const today = new Date();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    let cutoffTime: number | null;
    if (today.getFullYear() < year) {
      cutoffTime = null;
    } else if (today.getFullYear() > year) {
      cutoffTime = endOfYear.getTime();
    } else {
      cutoffTime = new Date(
        year,
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
    }

    let totalSoFar = 0;
    let daysElapsed = 0;

    if (cutoffTime !== null) {
      contributions.forEach((day) => {
        const dayTime = new Date(`${day.date}T00:00:00`).getTime();
        if (dayTime <= cutoffTime) {
          totalSoFar += day.count;
          daysElapsed += 1;
        }
      });
    }

    const totalDaysInYear = contributions.length;
    const projectedTotal =
      cutoffTime === null
        ? 0
        : daysElapsed === 0
        ? 0
        : daysElapsed >= totalDaysInYear
        ? totalForYear
        : Math.round((totalSoFar / daysElapsed) * totalDaysInYear);

    return {
      weeks,
      monthLabelMap,
      totalSoFar,
      projectedTotal,
      totalForYear,
    };
  }, [data, year]);

  const handleMouseEnter = (
    day: ContributionDay,
    event: ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>
  ) => {
    if (!gridRef.current) {
      return;
    }

    const gridRect = gridRef.current.getBoundingClientRect();
    const cellRect = event.currentTarget.getBoundingClientRect();

    setHoverInfo({
      day,
      position: {
        left:
          cellRect.left - gridRect.left + cellRect.width / 2,
        top: cellRect.top - gridRect.top,
      },
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  const gridVars: CSSProperties = {
    '--cell-size': CELL_SIZE,
    '--cell-gap': CELL_GAP,
  };

  return (
    <div className="w-full max-w-4xl rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-surface)] p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/themes/Yaru/status/projects.svg"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 opacity-80"
            />
            <h3 className="text-left text-base font-semibold text-white md:text-lg">
              {year} contribution activity
            </h3>
          </div>
          <p className="text-sm text-kali-text/70">
            Hover over a day to inspect how the streak is shaping up.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-kali-text/60">
          <Image
            src="/themes/Yaru/status/experience.svg"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 opacity-70"
          />
          <span>Less</span>
          <div className="flex items-center gap-1">
            {levelClasses.map((className) => (
              <span
                key={className}
                className={`${className} block h-3 w-3 rounded-sm`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex flex-col justify-between text-[11px] text-kali-text/50">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-fit" style={gridVars}>
            <div
              className="grid text-[11px] text-kali-text/60"
              style={{
                gridTemplateColumns: `repeat(${weeks.length || 1}, var(--cell-size))`,
                columnGap: 'var(--cell-gap)',
              }}
              aria-hidden="true"
            >
              {weeks.map((_, weekIndex) => (
                <span key={weekIndex} className="text-center">
                  {monthLabelMap.get(weekIndex) || ''}
                </span>
              ))}
            </div>
            <div
              ref={gridRef}
              className="relative mt-2"
            >
              <div
                role="grid"
                aria-label={`Daily contributions for ${year}`}
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${weeks.length || 1}, var(--cell-size))`,
                  columnGap: 'var(--cell-gap)',
                }}
              >
                {weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="grid"
                    style={{
                      gridTemplateRows: `repeat(7, var(--cell-size))`,
                      rowGap: 'var(--cell-gap)',
                    }}
                    role="row"
                  >
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return (
                          <span
                            key={`${weekIndex}-${dayIndex}`}
                            className="block h-[var(--cell-size)] w-[var(--cell-size)]"
                            aria-hidden="true"
                          />
                        );
                      }

                      const ariaLabel = `${day.count} contribution${
                        day.count === 1 ? '' : 's'
                      } on ${formatDateLabel(new Date(`${day.date}T00:00:00`))}`;

                      const levelClass = levelClasses[day.level] ?? levelClasses[0];

                      return (
                        <button
                          key={`${weekIndex}-${day.date}`}
                          type="button"
                          className={`${levelClass} h-[var(--cell-size)] w-[var(--cell-size)] rounded-sm transition duration-150 hover:scale-110 hover:shadow-[0_0_0_1px_var(--kali-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-surface)]`}
                          onMouseEnter={(event) => handleMouseEnter(day, event)}
                          onMouseLeave={handleMouseLeave}
                          onFocus={(event) => handleMouseEnter(day, event)}
                          onBlur={handleMouseLeave}
                          aria-label={ariaLabel}
                          tabIndex={-1}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              {hoverInfo ? (
                <div
                  ref={tooltipRef}
                  role="tooltip"
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-white/10 bg-black/90 px-2 py-1 text-xs text-white shadow-lg transition-opacity"
                  style={{
                    left: hoverInfo.position.left,
                    top: Math.max(hoverInfo.position.top - 32, 0),
                  }}
                >
                  <div className="font-semibold">
                    {hoverInfo.day.count}{' '}
                    {hoverInfo.day.count === 1 ? 'contribution' : 'contributions'}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-300">
                    {formatDateLabel(new Date(`${hoverInfo.day.date}T00:00:00`))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-kali-text/70 md:grid-cols-2">
        <div className="flex items-center gap-2 rounded-md border border-[color:var(--kali-border)]/40 bg-[color:var(--kali-overlay)]/20 px-3 py-2 transition-colors hover:bg-[color:var(--kali-overlay)]/40 focus-within:bg-[color:var(--kali-overlay)]/40">
          <Image
            src="/themes/Yaru/status/projects.svg"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 opacity-70"
          />
          <span className="text-kali-text/60">Contributions logged:</span>
          <span className="font-semibold text-white">
            {totalSoFar.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[color:var(--kali-border)]/40 bg-[color:var(--kali-overlay)]/20 px-3 py-2 transition-colors hover:bg-[color:var(--kali-overlay)]/40 focus-within:bg-[color:var(--kali-overlay)]/40">
          <Image
            src="/themes/Yaru/status/download.svg"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 opacity-70"
          />
          <span className="text-kali-text/60">Projected {year} total:</span>
          <span className="font-semibold text-white">
            {projectedTotal.toLocaleString()}
          </span>
        </div>
        <div className="md:col-span-2 text-xs text-kali-text/60">
          {!loading && totalForYear > 0 && projectedTotal >= totalForYear ? (
            <span>
              Pace is on track with {totalForYear.toLocaleString()} contributions recorded in the API snapshot.
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-kali-text/70">Loading contribution history…</div>
      ) : null}
      {error ? (
        <div className="mt-2 text-sm text-red-400" role="status">
          {error}
        </div>
      ) : null}
    </div>
  );
}
