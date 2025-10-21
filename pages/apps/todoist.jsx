import dynamic from 'next/dynamic';

const TodoistApp = dynamic(() => import('../../apps/todoist'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950/80 text-slate-300">
      Loading mission planner…
    </div>
  ),
});

export default function TodoistPage() {
  return <TodoistApp />;
}
