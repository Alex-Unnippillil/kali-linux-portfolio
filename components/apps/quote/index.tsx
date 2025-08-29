import dynamic from 'next/dynamic';

const QuoteApp = dynamic(() => import('../../../apps/quote'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default QuoteApp;

