import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../app-skeletons';

const QuoteApp = dynamic(() => import('../../../apps/quote'), {
  ssr: false,
  loading: () => getAppSkeleton('quote', 'Quote'),
});

export default QuoteApp;

