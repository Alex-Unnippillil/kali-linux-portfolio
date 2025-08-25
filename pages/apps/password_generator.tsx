import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PasswordGenerator = dynamic(
  () => import('../../apps/password_generator'),
  { ssr: false }
);

export default function PasswordGeneratorPage() {
  return (
    <UbuntuWindow title="password_generator">
      <PasswordGenerator />
    </UbuntuWindow>
  );
}
