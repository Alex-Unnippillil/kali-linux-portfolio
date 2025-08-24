import dynamic from 'next/dynamic';

const EvidenceNotebook = dynamic(
  () => import('../../../apps/evidence-notebook'),
  { ssr: false }
);

export default function EvidenceNotebookPage() {
  return <EvidenceNotebook />;
}
