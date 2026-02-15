import React from 'react';

const providers = [
  { name: 'AWS', icon: '/icons/cloud/aws.svg' },
  { name: 'Azure', icon: '/icons/cloud/azure.svg' },
  { name: 'GCP', icon: '/icons/cloud/gcp.svg' }
];

export default function DownloadGrid() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {providers.map((p) => (
        <div key={p.name} className="flex flex-col items-center text-sm">
          <img src={p.icon} alt={`${p.name} icon`} width={32} height={32} />
          <span className="mt-2">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
