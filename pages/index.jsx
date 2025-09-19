import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';

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
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Ubuntu />
    <div className="pwa-fab-container pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <InstallButton />
      <BetaBadge />
    </div>
  </>
);

export default App;
