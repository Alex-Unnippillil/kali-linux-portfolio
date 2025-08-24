import dynamic from 'next/dynamic';
export { CHECKPOINTS, advanceCheckpoints } from '../../apps/car-racer';
export default dynamic(() => import('../../apps/car-racer'), { ssr: false });
