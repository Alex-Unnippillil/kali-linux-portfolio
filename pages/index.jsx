import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';
import InstallButton from '../components/InstallButton';
import BetaBadge from '../components/BetaBadge';
import CTAButton from '../components/CTAButton';

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <CTAButton location="hero" />
    </div>
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
