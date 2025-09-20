import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/input-lab');

const InputLab = dynamic(() => import('../../apps/input-lab'), { ssr: false });

export default function InputLabPage() {
  return <InputLab />;
}
