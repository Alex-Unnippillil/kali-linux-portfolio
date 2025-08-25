import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CtSearch = dynamic(() => import('../../apps/ct-search'), { ssr: false });

export default function CtSearchPage() {
  return (
    <UbuntuWindow title="ct search">
      <CtSearch />
    </UbuntuWindow>
  );
}
