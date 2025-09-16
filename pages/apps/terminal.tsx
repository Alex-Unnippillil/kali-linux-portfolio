import dynamic from 'next/dynamic';

const TerminalPreview = dynamic(() => import('../../apps/terminal/tabs'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TerminalPage() {
  return <TerminalPreview />;
}
