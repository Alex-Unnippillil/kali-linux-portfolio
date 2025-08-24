import dynamic from 'next/dynamic';

const PcreRe2Lab = dynamic(() => import('../../apps/pcre-re2-lab'), { ssr: false });

export default function PcreRe2LabPage() {
  return <PcreRe2Lab />;
}
