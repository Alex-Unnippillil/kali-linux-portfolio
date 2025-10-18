import type { ReactElement } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

const App = (): ReactElement => (
  <>
    <nav
      aria-label="Skip links"
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-[1000]"
    >
      <ul className="flex flex-col gap-2 rounded-md bg-slate-900/90 p-4 shadow-lg">
        <li>
          <a
            href="#app-grid"
            className="rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Skip to app grid
          </a>
        </li>
        <li>
          <a
            href="#window-area"
            className="rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Skip to desktop content
          </a>
        </li>
      </ul>
    </nav>
    <Meta />
    <Ubuntu />
    <BetaBadge />
  </>
);

export default App;
