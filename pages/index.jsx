import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import { parseDeepLinkFromQuery } from '../lib/deepLink';

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
const App = () => {
  const router = useRouter();
  const deepLink = useMemo(() => {
    if (!router.isReady) return null;
    return parseDeepLinkFromQuery(router.query);
  }, [router.isReady, router.asPath]);

  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Meta />
      <Ubuntu deepLink={deepLink} />
      <BetaBadge />
      <InstallButton />
    </>
  );
};

export default App;
