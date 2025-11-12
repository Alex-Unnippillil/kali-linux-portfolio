import dynamic from 'next/dynamic';

const DailyQuoteApp = dynamic(
  () => import(/* webpackPrefetch: true */ '../components/daily-quote/DailyQuoteClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey text-white">
        <p className="animate-pulse text-sm tracking-wide">Loading daily quote…</p>
      </div>
    ),
  },
);

export default function DailyQuote() {
  return <DailyQuoteApp />;
}
