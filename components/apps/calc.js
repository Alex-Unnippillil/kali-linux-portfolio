import '../../utils/decimal';
import dynamic from 'next/dynamic';

const Calc = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Calc;
