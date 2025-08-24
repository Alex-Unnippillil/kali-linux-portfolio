import dynamic from 'next/dynamic';

const JwsJweWorkbench = dynamic(() => import('../../apps/jws-jwe-workbench'), { ssr: false });

export default function JwsJweWorkbenchPage() {
  return <JwsJweWorkbench />;
}
