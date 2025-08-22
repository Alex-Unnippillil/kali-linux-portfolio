import dynamic from 'next/dynamic';

const Nonogram = dynamic(() => import('../../apps/nonogram'), { ssr: false });

export default function NonogramPage() {
  return <Nonogram />;
}
