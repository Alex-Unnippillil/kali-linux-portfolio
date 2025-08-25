import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RegexRedactor = dynamic(() => import('../../apps/regex-redactor'), {
  ssr: false,
});

export default function RegexRedactorPage() {
  return (
    <UbuntuWindow title="regex redactor">
      <RegexRedactor />
    </UbuntuWindow>
  );
}
