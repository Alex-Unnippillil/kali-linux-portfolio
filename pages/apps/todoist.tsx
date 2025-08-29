import React from 'react';
import dynamic from 'next/dynamic';

const Todoist = dynamic(() => import('../../apps/todoist'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TodoistPage(): React.ReactElement {
  return <Todoist />;
}
