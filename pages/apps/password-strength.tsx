import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PasswordStrength = dynamic(() => import('../../apps/password-strength'), {
  ssr: false,
});

export default function PasswordStrengthPage() {
  return (
    <UbuntuWindow title="password strength">
      <PasswordStrength />
    </UbuntuWindow>
  );
}
