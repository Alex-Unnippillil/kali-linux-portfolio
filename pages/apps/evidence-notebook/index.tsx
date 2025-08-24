import dynamic from 'next/dynamic';

const EvidenceNotebook = dynamic(
  () => import('../../../components/apps/evidence-notebook'),
  { ssr: false }
);

export default function EvidenceNotebookPage() {
  return <EvidenceNotebook />;
}
