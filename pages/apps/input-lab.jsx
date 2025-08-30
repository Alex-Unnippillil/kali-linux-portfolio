import dynamic from 'next/dynamic';

const InputLab = dynamic(() => import('../../apps/input-lab'), { ssr: false });

export default function InputLabPage() {
  return <InputLab />;
}
