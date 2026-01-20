import '../../utils/decimal';
import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Calculator...
    </div>
  ),
});

export default function CalculatorApp() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <HelpPanel appId="calculator" />
      <Calculator />
    </div>
  );
}
