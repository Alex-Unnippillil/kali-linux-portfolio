import React from 'react';
import useMirrors from '../hooks/useMirrors';

export default function MirrorsPage() {
  const { mirrors, isLoading, error } = useMirrors();

  if (isLoading) {
    return <div data-testid="mirrors-skeleton" className="p-4">Loading mirrors...</div>;
  }

  if (error) {
    return (
      <div role="alert" className="p-4 text-red-600">
        Failed to load mirrors.
      </div>
    );
  }

  return (
    <ul className="p-4 list-disc list-inside">
      {Array.isArray(mirrors) && mirrors.length > 0 ? (
        mirrors.map((m: any, idx: number) => (
          <li key={idx}>{m.url || m.href || JSON.stringify(m)}</li>
        ))
      ) : (
        <li>No mirrors available.</li>
      )}
    </ul>
  );
}
