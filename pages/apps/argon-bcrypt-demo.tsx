import dynamic from 'next/dynamic';

const ArgonBcryptDemo = dynamic(() => import('../../components/apps/argon-bcrypt-demo'), {
  ssr: false,
});

export default function ArgonBcryptDemoPage() {
  return <ArgonBcryptDemo />;
}
