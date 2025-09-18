import dynamic from 'next/dynamic';

const CryptoToolkitApp = dynamic(() => import('../../apps/crypto-toolkit'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CryptoToolkitPage() {
  return <CryptoToolkitApp />;
}
