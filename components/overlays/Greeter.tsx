import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const Greeter: React.FC = () => {
  const [hidden, setHidden] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHidden(true);
    const desktop = document.getElementById('window-area');
    if (desktop) {
      desktop.setAttribute('tabindex', '-1');
      (desktop as HTMLElement).focus();
    }
  };

  if (hidden) return null;

  return (
    <div
      id="greeter-overlay"
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black bg-opacity-90"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-4"
        aria-label="login"
      >
        <Image
          src="/themes/Yaru/system/user-desktop.png"
          alt=""
          width={96}
          height={96}
          className="rounded-full"
        />
        <input
          ref={usernameRef}
          name="username"
          aria-label="Username"
          className="rounded px-2 py-1"
        />
        <input
          type="password"
          name="password"
          aria-label="Password"
          className="rounded px-2 py-1"
        />
        <button type="submit" className="mt-2 rounded bg-blue-600 px-4 py-2 text-white">
          Log In
        </button>
      </form>
    </div>
  );
};

export default Greeter;

