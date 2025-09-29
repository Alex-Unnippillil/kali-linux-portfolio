import dynamic from '@/utils/dynamic';

const InputLab = dynamic(() => import('../../apps/input-lab'));

export default function InputLabPage() {
  return <InputLab />;
}
