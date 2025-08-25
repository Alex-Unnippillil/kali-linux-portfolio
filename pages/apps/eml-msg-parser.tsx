import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const EmlMsgParser = dynamic(() => import('../../apps/eml-msg-parser'), {
  ssr: false,
});

export default function EmlMsgParserPage() {
  return (
    <UbuntuWindow title="eml msg parser">
      <EmlMsgParser />
    </UbuntuWindow>
  );
}
