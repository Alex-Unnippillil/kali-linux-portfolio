'use client';

import { useState, useEffect, useRef } from 'react';
import Clock from '@/components/util-components/clock';
import { useSettings } from '@/hooks/useSettings';

export function fakeSession(password: string): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

export default function LoginScreen({
  sessionFn = fakeSession,
}: {
  sessionFn?: (password: string) => Promise<void>;
}) {
  const { wallpaper } = useSettings();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sessionFn(password);
    setLoading(false);
  };

  return (
    <div className="relative h-screen w-screen text-white overflow-hidden">
      <img
        src={`/wallpapers/${wallpaper}.webp`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.7)_100%)]" />
        <div
          className="absolute inset-0 mix-blend-overlay opacity-30"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48ZmlsdGVyIGlkPSJmIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZikiIG9wYWNpdHk9Ii4zIi8+PC9zdmc+')",
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="absolute top-4 right-4 flex items-center space-x-4">
        <div className="text-xl">
          <Clock />
        </div>
        <div className="relative">
          <button
            aria-label="Power options"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-2 focus:outline-none focus:ring-2 focus:ring-white"
          >
            ⏻
          </button>
          {menuOpen && (
            <ul
              role="menu"
              aria-label="Power menu"
              className="absolute right-0 mt-2 w-32 rounded bg-black/80 backdrop-blur-sm shadow"
            >
              <li>
                <button
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Shutdown
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Restart
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <img
          src="/images/logos/bitmoji.png"
          alt="User avatar"
          className="mb-4 h-24 w-24 rounded-full"
        />
        <div className="mb-4 text-2xl font-medium" aria-label="Username">
          alex
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center space-y-4"
          aria-label="Login form"
        >
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            ref={inputRef}
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded bg-black/50 px-4 py-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Password"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
            aria-label="Log in"
          >
            {loading ? '…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
