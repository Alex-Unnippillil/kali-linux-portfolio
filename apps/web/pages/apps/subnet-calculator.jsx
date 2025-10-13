import dynamic from 'next/dynamic';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SubnetCalculatorPage() {
  return <SubnetCalculator />;
}
