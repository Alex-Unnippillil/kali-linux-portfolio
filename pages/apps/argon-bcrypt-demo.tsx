import dynamic from 'next/dynamic';

const ArgonBcryptDemo = dynamic(() => import('../../apps/argon-bcrypt-demo'), {
  ssr: false,
});

export default function ArgonBcryptDemoPage() {
  return <ArgonBcryptDemo />;
}
