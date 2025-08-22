import dynamic from 'next/dynamic';

const PasswordStrength = dynamic(() => import('../../apps/password-strength'), { ssr: false });

export default function PasswordStrengthPage() {
  return <PasswordStrength />;
}
