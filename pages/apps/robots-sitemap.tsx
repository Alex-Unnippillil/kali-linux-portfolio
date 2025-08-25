import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RobotsSitemap = dynamic(() => import('../../apps/robots-sitemap'), {
  ssr: false,
});

export default function RobotsSitemapPage() {
  return (
    <UbuntuWindow title="robots sitemap">
      <RobotsSitemap />
    </UbuntuWindow>
  );
}
