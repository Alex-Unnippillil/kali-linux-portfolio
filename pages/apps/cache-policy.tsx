import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CachePolicy = dynamic(() => import('../../apps/cache-policy'), {
  ssr: false,
});

export default function CachePolicyPage() {
  return (
    <UbuntuWindow title="cache policy">
      <CachePolicy />
    </UbuntuWindow>
  );
}
