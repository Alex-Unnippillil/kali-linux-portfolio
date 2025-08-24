import dynamic from 'next/dynamic';

const SameSiteLab = dynamic(() => import('../../components/apps/samesite-lab'), { ssr: false });

export default function SameSiteLabPage() {
  return <SameSiteLab />;
}

