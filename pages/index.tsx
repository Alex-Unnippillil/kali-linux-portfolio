import type { MouseEvent, ReactElement } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

type SkipTarget = {
  id: string;
  label: string;
};

const SKIP_TARGETS: SkipTarget[] = [
  { id: 'desktop', label: 'Skip to desktop' },
  { id: 'desktop-dock', label: 'Skip to dock' },
  { id: 'desktop-launcher', label: 'Skip to launcher' },
];

const focusTarget = (targetId: string) => {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(targetId);
  if (!target || typeof target.focus !== 'function') return;
  try {
    target.focus();
  } catch {
    // ignore focus errors caused by hidden or inert elements
  }
};

const App = (): ReactElement => (
  <>
    <nav aria-label="Skip links">
      {SKIP_TARGETS.map((skipTarget, index) => (
        <a
          key={skipTarget.id}
          href={`#${skipTarget.id}`}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            event.stopPropagation();
            focusTarget(skipTarget.id);
          }}
          onKeyDown={(event) => {
            if (event.key === ' ') {
              event.preventDefault();
              focusTarget(skipTarget.id);
            }
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:z-[999] focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          style={{ top: `${1 + index * 3}rem` }}
        >
          {skipTarget.label}
        </a>
      ))}
    </nav>
    <Meta />
    <Ubuntu />
    <BetaBadge />
  </>
);

export default App;
