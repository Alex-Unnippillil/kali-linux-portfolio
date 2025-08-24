import dynamic from 'next/dynamic';

const Battleship = dynamic(() => import('../../apps/battleship'), { ssr: false });
export default Battleship;
