import dynamic from 'next/dynamic';

const Frogger = dynamic(() => import('./client'), { ssr: false });

export default Frogger;
