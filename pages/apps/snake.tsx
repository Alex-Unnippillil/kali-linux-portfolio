import dynamic from 'next/dynamic';

const Snake = dynamic(() => import('../../apps/snake'), { ssr: false });

export default function SnakePage() {
  return <Snake />;
}
