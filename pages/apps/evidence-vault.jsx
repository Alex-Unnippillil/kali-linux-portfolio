import dynamic from 'next/dynamic';

const EvidenceVault = dynamic(() => import('../../components/apps/evidence-vault'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function EvidenceVaultPage() {
  return <EvidenceVault />;
}
