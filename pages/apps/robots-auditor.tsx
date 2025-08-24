import dynamic from 'next/dynamic';

const RobotsAuditor = dynamic(() => import('../../apps/robots-auditor'), {
  ssr: false,
});

export default function RobotsAuditorPage() {
  return <RobotsAuditor />;
}
