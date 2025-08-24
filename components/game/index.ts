import dynamic from 'next/dynamic';

export const GameClient = dynamic(() => import('./GameClient'), { ssr: false });
export default GameClient;
