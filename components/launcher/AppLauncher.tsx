'use client';

import { useEffect, useState } from 'react';

interface AppLauncherProps {
  showApps: () => void;
  open: boolean;
}

const AppLauncher: React.FC<AppLauncherProps> = ({ showApps, open }) => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  }, []);

  if (isTouch || open) {
    return null;
  }

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    showApps();
  };

  return (
    <div
      onPointerEnter={handlePointerEnter}
      className="fixed top-0 left-0 opacity-0"
      style={{ width: 12, height: 12, zIndex: 60 }}
    />
  );
};

export default AppLauncher;

