import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import ErrorBoundary from '../components/core/ErrorBoundary';
import MainContentSkeleton from '../components/common/MainContentSkeleton';

const Ubuntu = dynamic(
  () =>
    import('../components/ubuntu').catch((err) => {
      console.error('Failed to load Ubuntu component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <MainContentSkeleton />,
  }
);
const InstallButtonSkeleton = () => (
  <div
    role="status"
    aria-label="Loading install options"
    aria-busy="true"
    className="mx-auto mt-6 h-12 w-56 animate-pulse rounded bg-white/10"
  />
);
const InstallButton = dynamic(
  () =>
    import('../components/InstallButton').catch((err) => {
      console.error('Failed to load InstallButton component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <InstallButtonSkeleton />,
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
    <ErrorBoundary>
      <>
        <Ubuntu />
        <BetaBadge />
        <InstallButton />
      </>
    </ErrorBoundary>
  </>
);

export default App;
