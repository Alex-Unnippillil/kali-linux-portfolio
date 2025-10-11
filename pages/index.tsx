import type { NextPage } from 'next';

import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

const App: NextPage = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Ubuntu />
    <BetaBadge />
  </>
);

export default App;
