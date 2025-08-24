import dynamic from 'next/dynamic';

const Tetris = dynamic(() => import('./client'), { ssr: false });

export default Tetris;

