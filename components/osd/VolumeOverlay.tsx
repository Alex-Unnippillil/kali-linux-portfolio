'use client';

import Image from 'next/image';

interface Props {
  volume: number;
  visible: boolean;
}

const ICON = '/themes/Yaru/status/audio-volume-medium-symbolic.svg';

export default function VolumeOverlay({ volume, visible }: Props) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="flex flex-col items-center bg-black/60 text-white p-4 rounded">
        <Image src={ICON} alt="volume" width={48} height={48} />
        <span className="mt-2 text-xl">{volume}%</span>
      </div>
    </div>
  );
}
