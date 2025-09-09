import dynamic from 'next/dynamic';

const KaliTools = dynamic(() => import('../../../apps/kali-tools'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default KaliTools;
