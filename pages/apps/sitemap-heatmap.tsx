import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SitemapHeatmap = dynamic(() => import('../../apps/sitemap-heatmap'), {
  ssr: false,
});

export default function SitemapHeatmapPage() {
  return (
    <UbuntuWindow title="sitemap heatmap">
      <SitemapHeatmap />
    </UbuntuWindow>
  );
}
