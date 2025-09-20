import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { getAppSkeleton } from '../../components/app-skeletons';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), {
  ssr: false,
  loading: () => getAppSkeleton('password_generator', 'Password Generator'),
});

export default function PasswordGeneratorPage() {
  return <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />;
}
