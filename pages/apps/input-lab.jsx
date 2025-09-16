import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const InputLab = dynamic(() => import('../../apps/input-lab'), {
  ssr: false,
  loading: () => getAppSkeleton('input-lab', 'Input Lab'),
});

export default function InputLabPage() {
  return <InputLab />;
}
