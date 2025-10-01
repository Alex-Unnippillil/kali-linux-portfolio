import dynamic from 'next/dynamic';

const TerminalApp = dynamic(() => import('../../apps/terminal'), {
  ssr: false,
  loading: () => null,
});

export default function TerminalPage() {
  return <TerminalApp />;
}
