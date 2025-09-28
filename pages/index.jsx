import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';

const Kali = dynamic(
  () =>
    import('../components/kali').catch((err) => {
      console.error('Failed to load Kali component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Kali...</p>,
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
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Kali />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
