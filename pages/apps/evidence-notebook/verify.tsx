import dynamic from 'next/dynamic';
import UbuntuWindow from '../../../components/UbuntuWindow';

const VerifyEvidence = dynamic(
  () => import('../../../apps/evidence-notebook/verify'),
  { ssr: false }
);

export default function EvidenceNotebookVerifyPage() {
  return (
    <UbuntuWindow title="evidence notebook verify">
      <VerifyEvidence />
    </UbuntuWindow>
  );
}
