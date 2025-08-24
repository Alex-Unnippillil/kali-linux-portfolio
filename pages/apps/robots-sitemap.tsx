import dynamic from 'next/dynamic';

const RobotsSitemap = dynamic(() => import('../../apps/robots-sitemap'), {
  ssr: false,
});

export default function RobotsSitemapPage() {
  return <RobotsSitemap />;
}

