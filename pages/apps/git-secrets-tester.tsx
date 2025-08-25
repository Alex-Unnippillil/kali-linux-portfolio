import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const GitSecretsTester = dynamic(
  () => import('../../apps/git-secrets-tester'),
  { ssr: false }
);

export default function GitSecretsTesterPage() {
  return (
    <UbuntuWindow title="git secrets tester">
      <GitSecretsTester />
    </UbuntuWindow>
  );
}
