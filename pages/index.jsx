import { getPageMetadata, getStructuredData } from '@/lib/metadata';
import dynamic from 'next/dynamic';
import BetaBadge from '../components/BetaBadge';
import { getCspNonce } from '../utils/csp';

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

export const metadata = getPageMetadata('/');

/**
 * @returns {JSX.Element}
 */
const App = () => {
  const structuredData = getStructuredData('/');
  const nonce = getCspNonce();

  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      {structuredData && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <Ubuntu />
      <BetaBadge />
      <InstallButton />
    </>
  );
};

export default App;
