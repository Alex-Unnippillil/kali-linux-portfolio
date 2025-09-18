import dynamic from 'next/dynamic';

const FocusApp = dynamic(() => import('../../apps/focus'), { ssr: false });

const FocusPage = () => <FocusApp />;

export default FocusPage;
