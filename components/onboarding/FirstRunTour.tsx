import { useId } from 'react';
import useFirstRunTour from '../../hooks/useFirstRunTour';

interface FirstRunTourProps {
  desktopReady: boolean;
  disabled?: boolean;
}

const TOUR_STEPS = [
  {
    title: 'Explore the dock',
    description:
      'Launch favourite tools with a single click or right-click to pin new apps for quick access.',
  },
  {
    title: 'Browse the app grid',
    description:
      'Open the Whisker menu or press the super key to search across games, simulators, and utilities.',
  },
  {
    title: 'Arrange your workspace',
    description:
      'Drag windows, snap them to edges, or cycle with Alt+Tab to manage multiple tasks at once.',
  },
];

export default function FirstRunTour({ desktopReady, disabled = false }: FirstRunTourProps) {
  const { shouldShow, complete, skip } = useFirstRunTour();
  const descriptionId = useId();
  const titleId = useId();

  if (!desktopReady || disabled || !shouldShow) {
    return null;
  }

  return (
    <div
      data-testid="first-run-tour"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="w-full max-w-xl rounded-lg border border-ub-border-orange bg-slate-900/95 p-6 shadow-2xl backdrop-blur">
        <h2 id={titleId} className="text-2xl font-semibold">
          Welcome aboard
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-200">
          This quick tour highlights the essentials of the Kali Linux desktop simulation so you can start exploring right away.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-slate-200">
          {TOUR_STEPS.map((step) => (
            <li key={step.title} className="rounded bg-white/5 p-3">
              <p className="font-medium text-white">{step.title}</p>
              <p className="mt-1 text-slate-200">{step.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={skip}
            className="rounded border border-transparent px-4 py-2 text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={complete}
            className="rounded bg-ub-orange px-4 py-2 font-medium text-black transition hover:bg-ub-border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
