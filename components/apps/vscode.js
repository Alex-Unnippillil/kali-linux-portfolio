// VSCode-like editor implemented with Monaco and filesystem access
import dynamic from 'next/dynamic';

const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });


export default VsCode;

export const displayVsCode = () => <VsCode />;
