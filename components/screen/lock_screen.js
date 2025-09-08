import React, { useState, useRef, useEffect } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

/**
 * Authentication screen used for both login and lock flows.
 * Shows the current time, a generic avatar and a password field.
 */
export default function AuthScreen({
  isLocked = false,
  mode = 'lock',
  username = 'user',
  onSubmit,
}) {
  const { wallpaper } = useSettings();
  const [password, setPassword] = useState('');
  const inputRef = useRef(null);

  const visible = mode === 'login' || isLocked;

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
    }
  }, [visible]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(password);
    setPassword('');
  };

  return (
    <div
      id="auth-screen"
      style={{ zIndex: '100', contentVisibility: 'auto' }}
      className={`${visible ? 'visible translate-y-0' : 'invisible -translate-y-full'} absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen`}
    >
      <img
        src={`/wallpapers/${wallpaper}.webp`}
        alt=""
        className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${visible ? 'blur-md' : 'blur-none'}`}
      />
      <div className="w-full h-full z-50 relative flex flex-col items-center justify-center text-white">
        <div className="absolute top-10 text-center">
          <div className="text-7xl">
            <Clock onlyTime={true} />
          </div>
          <div className="mt-2 text-xl font-medium">
            <Clock onlyDay={true} />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-black bg-opacity-50 p-8 rounded flex flex-col items-center">
          <div className="w-24 h-24 rounded-full mb-4 border-2 border-white bg-gray-600 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-16 h-16 text-white"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.866 0-7 3.134-7 7h14c0-3.866-3.134-7-7-7z" />
            </svg>
          </div>
          <div className="text-2xl mb-4">{username}</div>
          <input
            ref={inputRef}
            type="password"
            className="px-4 py-2 rounded bg-gray-800 focus:outline-none"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
}

