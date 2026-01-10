import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from '../createLiveRegionLoader';

const QuoteApp = dynamic(() => import('../../../apps/quote'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Quote Generator...', {
    className: 'flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center',
  }),
});

export default QuoteApp;

