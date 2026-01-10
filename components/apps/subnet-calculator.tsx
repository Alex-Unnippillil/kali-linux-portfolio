import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from './createLiveRegionLoader';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Subnet Calculator...', {
    className: 'flex h-full w-full items-center justify-center bg-ub-cool-grey',
  }),
});

export default SubnetCalculator;
