import dynamic from 'next/dynamic';

const GitSecretsTester = dynamic(() => import('../../apps/git-secrets-tester'), { ssr: false });

export default function GitSecretsTesterPage() {
  return <GitSecretsTester />;
}

