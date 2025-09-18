import dynamic from 'next/dynamic';

const WorkspaceSwitcherApp = dynamic(
  () => import('../../apps/workspace-switcher'),
  { ssr: false },
);

export default function WorkspaceSwitcherPage() {
  return <WorkspaceSwitcherApp />;
}
