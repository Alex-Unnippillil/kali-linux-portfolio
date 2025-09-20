import '../../utils/decimal';
import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../app-skeletons';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => getAppSkeleton('calculator', 'Calculator'),
});

export default Calculator;

