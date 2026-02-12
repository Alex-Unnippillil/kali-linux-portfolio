"use client";

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface LockScreenProps {
  /** Username to display on the lock screen */
  username: string;
  /** Callback invoked when the user submits a password */
  onUnlock: (password: string) => void;
  /** Callback invoked when the lock screen is cancelled (e.g. via ESC) */
  onCancel: () => void;
}

export default function LockScreen({
  username,
  onUnlock,
  onCancel,
}: LockScreenProps) {
  const { wallpaper } = useSettings();
  const [password, setPassword] = useState('');
  const [time, setTime] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Focus password field and handle ESC key to cancel
  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(password);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <img
        src={`/wallpapers/${wallpaper}.webp`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-md"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center text-white">
        <div className="text-6xl font-bold" data-testid="lock-time">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="mt-4 text-2xl">{username}</div>
        <form onSubmit={submit} className="mt-8" aria-label="unlock form">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 rounded bg-black/60 text-white focus:outline-none"
            placeholder="Password"
            aria-label="Password"
          />
        </form>
      </div>
    </div>
  );
}

