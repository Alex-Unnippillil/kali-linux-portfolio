import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const YaraTester = dynamic(() => import('../../apps/yara-tester'), {
  ssr: false,
});

export default function YaraTesterPage() {
  return (
    <UbuntuWindow title="yara tester">
      <YaraTester />
    </UbuntuWindow>
  );
}
