import '../../utils/decimal';
import dynamic from '@/utils/dynamic';

const Calculator = dynamic(() => import('../../apps/calculator'));

export default function CalculatorPage() {
  return <Calculator />;
}

