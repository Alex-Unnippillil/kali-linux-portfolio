import dynamic from 'next/dynamic';

const WinKexHelp = dynamic(
  () => import('../../../apps/help/win-kex'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default WinKexHelp;

