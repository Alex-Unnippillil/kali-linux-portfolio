import dynamic from 'next/dynamic';

const Pinball = dynamic(() => import('../../apps/pinball'), { ssr: false });

export default function PinballPage() {
  return <Pinball />;
}
