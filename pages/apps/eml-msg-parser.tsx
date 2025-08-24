import dynamic from 'next/dynamic';

const EmlMsgParser = dynamic(
  () => import('../../components/apps/eml-msg-parser'),
  { ssr: false }
);

export default function EmlMsgParserPage() {
  return <EmlMsgParser />;
}

