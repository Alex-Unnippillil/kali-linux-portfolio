import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RequestBuilder = dynamic(() => import('../../apps/request-builder'), {
  ssr: false,
});

export default function RequestBuilderPage() {
  return (
    <UbuntuWindow title="request builder">
      <RequestBuilder />
    </UbuntuWindow>
  );
}
