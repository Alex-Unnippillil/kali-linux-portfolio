"use client";

import Image from 'next/image';
import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

export default function UndercoverToggle() {
  const { theme, setTheme } = useSettings();
  const [tooltip, setTooltip] = useState(false);
  const [prev, setPrev] = useState('default');

  const isUndercover = theme === 'undercover';

  const toggle = () => {
    if (isUndercover) {
      setTheme(prev);
    } else {
      setPrev(theme);
      setTheme('undercover');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('themechange'));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Undercover"
        onClick={toggle}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="p-2"
      >
        <Image
          src="/themes/Windows/status/undercover-symbolic.svg"
          alt="Undercover"
          width={16}
          height={16}
        />
      </button>
      {tooltip && (
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white"
        >
          <p>Windows-like theme</p>
          <a
            className="underline"
            href="https://www.kali.org/docs/general-use/undercover/"
            target="_blank"
            rel="noreferrer"
          >
            Learn more
          </a>
        </div>
      )}
    </div>
  );
}
