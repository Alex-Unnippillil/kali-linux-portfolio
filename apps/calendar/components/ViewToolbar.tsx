import { CalendarView } from '../types';

interface ViewToolbarProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
];

export default function ViewToolbar({
  label,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
}: ViewToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded border border-slate-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-slate-600 focus:outline-none focus:ring"
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded border border-slate-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-slate-600 focus:outline-none focus:ring"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded border border-slate-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-slate-600 focus:outline-none focus:ring"
          aria-label="Next"
        >
          ›
        </button>
        <span className="ml-2 text-lg font-semibold text-white" aria-live="polite">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1" role="tablist" aria-label="Calendar views">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            className={`rounded px-3 py-1 text-sm font-medium focus:outline-none focus:ring ${
              view === option.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-500 text-white hover:bg-slate-600'
            }`}
            onClick={() => onViewChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
