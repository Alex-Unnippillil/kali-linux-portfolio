import dynamic from 'next/dynamic';

const RegexRedactor = dynamic(() => import('../../apps/regex-redactor'), { ssr: false });

export default function RegexRedactorPage() {
  return <RegexRedactor />;
}
