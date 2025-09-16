import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/autopsy');

const Autopsy = dynamic(() => import('../../apps/autopsy'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function AutopsyPage() {
  return <Autopsy />;
}
