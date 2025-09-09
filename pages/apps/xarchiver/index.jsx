import dynamic from 'next/dynamic';

const XArchiver = dynamic(() => import('../../../apps/xarchiver'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default XArchiver;
