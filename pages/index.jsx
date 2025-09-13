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
    loading: () => (
      <p>
        <span data-i18n="loadingUbuntu">Loading Ubuntu...</span>
      </p>
    ),
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
    loading: () => (
      <p>
        <span data-i18n="loadingInstallOptions">
          Loading install options...
        </span>
      </p>
    ),
  }
);

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      <span data-i18n="skipToContent">Skip to content</span>
    </a>
    <Meta />
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
  </>
);

export default App;
