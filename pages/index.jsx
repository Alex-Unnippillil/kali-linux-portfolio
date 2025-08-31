import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';
import InstallButton from '../components/InstallButton';
import BetaBadge from '../components/BetaBadge';
import SiteFooter from '../components/SiteFooter';

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
    <SiteFooter />
  </>
);

export default App;
