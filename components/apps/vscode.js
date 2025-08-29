// VSCode app uses a Stack iframe, so no editor dependencies are required
import dynamic from 'next/dynamic';

const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

export default VsCode;

export const displayVsCode = () => <VsCode />;
