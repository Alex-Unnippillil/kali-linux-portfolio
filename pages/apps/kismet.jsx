import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/kismet');

const Kismet = dynamic(() => import('../../apps/kismet'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function KismetPage() {
  return <Kismet />;
}
