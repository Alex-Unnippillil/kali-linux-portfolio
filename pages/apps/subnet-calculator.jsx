import dynamic from '@/utils/dynamic';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'));

export default function SubnetCalculatorPage() {
  return <SubnetCalculator />;
}
