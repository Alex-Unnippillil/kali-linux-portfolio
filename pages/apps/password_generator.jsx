import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
export const metadata = getPageMetadata('/apps/password_generator');

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PasswordGeneratorPage() {
  return <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />;
}
