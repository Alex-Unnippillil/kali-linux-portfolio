import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';

const Ubuntu = dynamic(() => import('../components/ubuntu'), { ssr: false });
const InstallButton = dynamic(() => import('../components/InstallButton'), {
  ssr: false,
});

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
