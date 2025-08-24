import dynamic from 'next/dynamic';

const VulnerabilitySearch = dynamic(() => import('../components/vulnerability-search'), {
  ssr: false,
});

export default function VulnerabilitiesPage() {
  return <VulnerabilitySearch />;
}
