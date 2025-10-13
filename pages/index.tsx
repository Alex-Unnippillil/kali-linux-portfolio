import type { ReactElement } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

const App = (): ReactElement => (
  <>
    <a href="#desktop" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Ubuntu />
    <footer aria-label="Site status indicator" className="relative">
      <span className="sr-only">Beta status indicator for the Kali Linux Portfolio desktop experience.</span>
      <BetaBadge />
    </footer>
  </>
);

export default App;
