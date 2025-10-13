import dynamic from 'next/dynamic';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Subnet Calculator...
    </div>
  ),
});

export default SubnetCalculator;
