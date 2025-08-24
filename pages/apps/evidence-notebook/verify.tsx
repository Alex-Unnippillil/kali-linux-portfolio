import dynamic from 'next/dynamic';

const VerifyEvidence = dynamic(
  () => import('../../../apps/evidence-notebook/verify'),
  { ssr: false }
);

export default function EvidenceNotebookVerifyPage() {
  return <VerifyEvidence />;
}
