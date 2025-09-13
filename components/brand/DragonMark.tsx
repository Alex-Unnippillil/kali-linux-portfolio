import React from 'react';

interface DragonMarkProps {
  className?: string;
}

export default function DragonMark({ className = '' }: DragonMarkProps) {
  const allowLogo = process.env.NEXT_PUBLIC_ALLOW_KALI_LOGO === 'true';

  if (allowLogo) {
    return (
      <img src="/brand/kali-logo.svg" alt="Kali Linux logo" className={className} />
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Dragon silhouette"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2c-3 0-5 2-5 5v3H4v4h3v4h4v-4h3l3 4h4l-4-5c1-1 2-3 2-5 0-4-3-6-7-6z" />
    </svg>
  );
}

