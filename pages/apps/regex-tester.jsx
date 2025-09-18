import dynamic from 'next/dynamic';

const RegexTesterPreview = dynamic(() => import('../../apps/regex-tester'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function RegexTesterPage() {
  return <RegexTesterPreview />;
}
