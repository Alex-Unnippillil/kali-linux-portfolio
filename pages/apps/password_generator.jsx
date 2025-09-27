import { getDailySeed } from '../../utils/dailySeed';
import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

const PasswordGenerator = createSuspenseAppPage(
  () => import('../../apps/password_generator'),
  {
    appName: 'Password Generator',
  },
);

export default function PasswordGeneratorPage() {
  return (
    <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />
  );
}
