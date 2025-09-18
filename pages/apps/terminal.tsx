import dynamic from 'next/dynamic';

const TerminalApp = dynamic(() => import('../../components/apps/terminal'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TerminalPage() {
  return <TerminalApp />;
}
