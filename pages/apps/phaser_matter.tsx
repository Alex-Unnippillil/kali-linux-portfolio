import dynamic from 'next/dynamic';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), { ssr: false });

export default function PhaserMatterPage() {
  return <PhaserMatter />;
}
