import dynamic from 'next/dynamic';

const Page2048 = dynamic(() => import('../../apps/2048'), { ssr: false });

export default Page2048;
