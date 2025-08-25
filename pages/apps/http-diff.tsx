import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const HttpDiff = dynamic(() => import('../../apps/http-diff'), { ssr: false });

export default function HttpDiffPage() {
  return (
    <UbuntuWindow title="http diff">
      <HttpDiff />
    </UbuntuWindow>
  );
}
