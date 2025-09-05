'use client';

import Image from 'next/image';
import { useIconTheme } from '../hooks/useIconTheme';

function WindowIcon({ icon, alt }: { icon: string; alt: string }) {
  const { iconTheme } = useIconTheme();
  return (
    <Image
      src={`/themes/${iconTheme}/window/${icon}.svg`}
      alt={alt}
      width={16}
      height={16}
    />
  );
}

export function CloseIcon() {
  return <WindowIcon icon="window-close-symbolic" alt="Close" />;
}

export function MinimizeIcon() {
  return <WindowIcon icon="window-minimize-symbolic" alt="Minimize" />;
}

export function MaximizeIcon() {
  return <WindowIcon icon="window-maximize-symbolic" alt="Maximize" />;
}

export function RestoreIcon() {
  return <WindowIcon icon="window-restore-symbolic" alt="Restore" />;
}

export function PinIcon() {
  return <WindowIcon icon="window-pin-symbolic" alt="Pin" />;
}

