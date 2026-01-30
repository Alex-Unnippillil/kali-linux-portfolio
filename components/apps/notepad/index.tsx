import dynamic from 'next/dynamic';

const Notepad = dynamic(() => import('../../../apps/notepad'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Notepad;
