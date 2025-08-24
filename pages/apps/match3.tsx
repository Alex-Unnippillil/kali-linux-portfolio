import dynamic from 'next/dynamic';

const Match3 = dynamic(() => import('../../apps/match3'), { ssr: false });

export default function Match3Page() {
  return <Match3 />;
}
