import dynamic from 'next/dynamic';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), { ssr: false });

export default function PasswordGeneratorPage() {
  return <PasswordGenerator />;
}
