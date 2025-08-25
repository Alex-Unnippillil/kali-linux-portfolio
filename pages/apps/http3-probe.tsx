import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Http3Probe = dynamic(() => import('../../apps/http3-probe'), {
  ssr: false,
});

export default function Http3ProbePage() {
  return (
    <UbuntuWindow title="http3 probe">
      <Http3Probe />
    </UbuntuWindow>
  );
}
