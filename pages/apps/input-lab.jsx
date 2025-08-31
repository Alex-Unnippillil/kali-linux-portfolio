import dynamic from '@/utils/dynamic';

const InputLab = dynamic(() => import('@/apps/input-lab'), { ssr: false });

export default function InputLabPage() {
  return <InputLab />;
}
