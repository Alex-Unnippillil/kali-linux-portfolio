import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const JwsJweWorkbench = dynamic(() => import('../../apps/jws-jwe-workbench'), {
  ssr: false,
});

export default function JwsJweWorkbenchPage() {
  return (
    <UbuntuWindow title="jws jwe workbench">
      <JwsJweWorkbench />
    </UbuntuWindow>
  );
}
