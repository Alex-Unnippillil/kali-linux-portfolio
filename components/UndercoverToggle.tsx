"use client";
import Image from 'next/image';
import { useSettings } from '../hooks/useSettings';

export default function UndercoverToggle() {
  const { theme, setTheme } = useSettings();
  const active = theme === 'undercover';
  const icon = '/themes/Undercover/windows-logo.svg';

  return (
    <button
      type="button"
      title="Undercover mode disguises the desktop to look like Windows"
      aria-label="Undercover mode"
      onClick={() => setTheme(active ? 'default' : 'undercover')}
      className="focus:outline-none"
    >
      <Image src={icon} alt="Undercover" width={16} height={16} />
    </button>
  );
}
