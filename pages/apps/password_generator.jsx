import dynamic from '@/utils/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'));

export default function PasswordGeneratorPage() {
  return <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />;
}
