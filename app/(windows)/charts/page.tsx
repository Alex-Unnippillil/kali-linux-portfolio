import dynamic from 'next/dynamic';

const ClientChart = dynamic(() => import('./ClientChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
      Loading chart...
    </div>
  ),
});

export default function ChartsPage() {
  return <ClientChart />;
}
