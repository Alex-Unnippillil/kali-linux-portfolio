import dynamic from 'next/dynamic';

const Checkers = dynamic(() => import('../../apps/checkers'), { ssr: false });

export default function CheckersPage() {
  return <Checkers />;
}
