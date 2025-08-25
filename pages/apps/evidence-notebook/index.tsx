import dynamic from 'next/dynamic';
import UbuntuWindow from '../../../components/UbuntuWindow';

const EvidenceNotebook = dynamic(
  () => import('../../../components/apps/evidence-notebook'),
  { ssr: false }
);

export default function EvidenceNotebookPage() {
  return (
    <UbuntuWindow title="evidence notebook">
      <EvidenceNotebook />
    </UbuntuWindow>
  );
}
