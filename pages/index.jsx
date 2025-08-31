import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';
import InstallButton from '../components/InstallButton';
import BetaBadge from '../components/BetaBadge';
import Hero from '../components/Hero';

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Hero />
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
