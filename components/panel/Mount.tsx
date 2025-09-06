import { isBrowser } from '@/utils/env';
import React, { useState } from 'react';
import volumesData from '../../data/fstab.json';

interface Volume {
  device: string;
  mountPoint: string;
  fsType: string;
  options: string;
  mounted: boolean;
}

const MountPanel: React.FC = () => {
  const [volumes, setVolumes] = useState<Volume[]>(volumesData);

  const handleMount = (index: number) => {
    const volume = volumes[index];
    if (!volume.mounted) {
      const updated = [...volumes];
      updated[index] = { ...volume, mounted: true };
      setVolumes(updated);
      if (isBrowser()) {
        try {
          window.open(`thunar://${volume.mountPoint}`);
        } catch (err) {
          console.error('Failed to open Thunar', err);
        }
      }
    }
  };

  const handleUnmount = (index: number) => {
    const volume = volumes[index];
    if (volume.mounted) {
      const updated = [...volumes];
      updated[index] = { ...volume, mounted: false };
      setVolumes(updated);
    }
  };

  const handleEject = (index: number) => {
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Volumes</h2>
      <ul>
        {volumes.map((v, i) => (
          <li key={v.device} className="flex items-center justify-between mb-2">
            <span>
              {v.device} on {v.mountPoint} ({v.fsType})
            </span>
            {v.mounted ? (
              <span>
                <button
                  className="mr-2 px-2 py-1 bg-gray-200 rounded"
                  onClick={() => handleUnmount(i)}
                >
                  Unmount
                </button>
                <button
                  className="px-2 py-1 bg-red-200 rounded"
                  onClick={() => handleEject(i)}
                >
                  Eject
                </button>
              </span>
            ) : (
              <button
                className="px-2 py-1 bg-green-200 rounded"
                onClick={() => handleMount(i)}
              >
                Mount
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MountPanel;

