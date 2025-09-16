import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/simon');

const Simon = dynamic(() => import('../../apps/simon'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SimonPage() {
  return <Simon />;
}
