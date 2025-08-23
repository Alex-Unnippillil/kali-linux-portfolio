import dynamic from 'next/dynamic';

const BinaryHeader = dynamic(() => import('../../apps/binary-header'), { ssr: false });

export default function BinaryHeaderPage() {
  return <BinaryHeader />;
}
