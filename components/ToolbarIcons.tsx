import Image from 'next/image';
import { useIconPack } from '@/hooks/useIconPack';

function Icon({ name, alt }: { name: string; alt: string }) {
  const { icons } = useIconPack();
  const src = icons[name];
  return <Image src={src} alt={alt} width={16} height={16} />;
}

export function CloseIcon() {
  return <Icon name="close" alt="Close" />;
}

export function MinimizeIcon() {
  return <Icon name="minimize" alt="Minimize" />;
}

export function MaximizeIcon() {
  return <Icon name="maximize" alt="Maximize" />;
}

export function RestoreIcon() {
  return <Icon name="restore" alt="Restore" />;
}

export function PinIcon() {
  return <Icon name="pin" alt="Pin" />;
}
