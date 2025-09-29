import dynamic from 'next/dynamic';
import QuoteAppSkeleton from './QuoteAppSkeleton';

const QuoteApp = dynamic(() => import('../../../apps/quote'), {
  ssr: false,
  loading: () => <QuoteAppSkeleton />,
});

export default QuoteApp;

