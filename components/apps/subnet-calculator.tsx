import dynamic from 'next/dynamic';
import SubnetCalculatorSkeleton from './SubnetCalculatorSkeleton';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'), {
  ssr: false,
  loading: () => <SubnetCalculatorSkeleton />,
});

export default SubnetCalculator;
