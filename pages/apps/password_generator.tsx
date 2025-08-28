import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';
import { getDailySeed } from '../../utils/dailySeed';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function PasswordGeneratorPage() {
  return <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />;
}
