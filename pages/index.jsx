import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import SkipLinks from '../components/system/SkipLinks';

const Ubuntu = dynamic(
  () =>
    import('../components/ubuntu').catch((err) => {
      console.error('Failed to load Ubuntu component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Ubuntu...</p>,
  }
);
const InstallButton = dynamic(
  () =>
    import('../components/InstallButton').catch((err) => {
      console.error('Failed to load InstallButton component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading install options...</p>,
  }
);

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <SkipLinks />
    <Meta />
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
