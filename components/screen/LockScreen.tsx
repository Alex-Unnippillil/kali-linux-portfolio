"use client";

import React, { useEffect, useRef } from 'react';
import { useWallpaper } from '@/lib/wallpaper';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LockScreen({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wallpaper = useWallpaper();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
    >
      <img
        src={wallpaper}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-lg"
      />
      <form
        onSubmit={(e) => e.preventDefault()}
        className="relative z-10"
      >
        <input
          ref={inputRef}
          type="password"
          aria-label="Password"
          className="px-4 py-2 rounded bg-black/60 text-white focus:outline-none"
        />
      </form>
    </div>
  );
}
