import dynamic from 'next/dynamic';

const RobotsAuditor = dynamic(() => import('../../components/apps/robots-auditor'), {
  ssr: false,
});

export default function RobotsAuditorPage() {
  return <RobotsAuditor />;
}
