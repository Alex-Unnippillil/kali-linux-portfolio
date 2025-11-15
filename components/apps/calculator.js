import '../../utils/decimal';
import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from './createLiveRegionLoader';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Calculator...', {
    className: 'flex h-full w-full items-center justify-center bg-ub-cool-grey',
  }),
});

export default Calculator;

