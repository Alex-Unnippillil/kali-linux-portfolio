import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PcreRe2Lab = dynamic(() => import('../../apps/pcre-re2-lab'), {
  ssr: false,
});

export default function PcreRe2LabPage() {
  return (
    <UbuntuWindow title="pcre re2 lab">
      <PcreRe2Lab />
    </UbuntuWindow>
  );
}
