'use client';

import { useEffect, useRef, useState } from 'react';
import seedrandom from 'seedrandom';
import usePersistentState from '../../hooks/usePersistentState';

const CONNECT_SOUND_SRC = '/sounds/connection.mp3';
const UPDATE_INTERVAL = 3000; // 3 seconds

export default function NetworkPopover() {
  const [uploadKbps, setUploadKbps] = useState(0);
  const [downloadKbps, setDownloadKbps] = useState(0);
  const [dnd] = usePersistentState('qs-dnd', false);
  const rngRef = useRef<seedrandom.prng | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // reset RNG on mount for predictable demo behavior
    rngRef.current = seedrandom('network-demo');

    function updateSpeeds() {
      const rng = rngRef.current!;
      setUploadKbps(Math.floor(rng() * 1000));
      setDownloadKbps(Math.floor(rng() * 1000));
      if (!dnd) {
        const audio = new Audio(CONNECT_SOUND_SRC);
        audio.play().catch(() => {});
      }
    }

    updateSpeeds();
    intervalRef.current = setInterval(updateSpeeds, UPDATE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dnd]);

  return (
    <div className="p-2 text-sm">
      <div>Up: {uploadKbps} kbps</div>
      <div>Down: {downloadKbps} kbps</div>
    </div>
  );
}

