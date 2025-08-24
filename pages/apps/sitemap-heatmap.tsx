import dynamic from 'next/dynamic';

const SitemapHeatmap = dynamic(() => import('../../components/apps/sitemap-heatmap'), {
  ssr: false,
});

export default function SitemapHeatmapPage() {
  return <SitemapHeatmap />;
}
