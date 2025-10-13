'use client';

import dynamic from 'next/dynamic';

const TodoistApp = dynamic(() => import('./todoist'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading tasks...
    </div>
  ),
});

export const displayTodoist = () => <TodoistApp />;

displayTodoist.prefetch = () => {
  if (typeof TodoistApp.preload === 'function') {
    TodoistApp.preload();
  }
};
