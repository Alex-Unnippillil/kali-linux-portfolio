import { useState } from 'react';

const users = [
  { name: 'kali', username: 'kali' },
  { name: 'root', username: 'root' },
];

const sessions = ['XFCE', 'GNOME', 'KDE'];
const languages = ['English (US)', 'Español', 'Français'];
const layouts = ['US', 'UK', 'DE'];
const backgrounds = [
  'wall-1.webp',
  'wall-2.webp',
  'wall-3.webp',
  'wall-4.webp',
  'wall-5.webp',
  'wall-6.webp',
  'wall-7.webp',
  'wall-8.webp',
];

/**
 * LightDM style login screen
 * @returns {JSX.Element}
 */
export default function LightdmPage() {
  const [user, setUser] = useState(users[0]);
  const [session, setSession] = useState(sessions[0]);
  const [language, setLanguage] = useState(languages[0]);
  const [layout, setLayout] = useState(layouts[0]);
  const [background, setBackground] = useState(backgrounds[0]);
  const [password, setPassword] = useState('');

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: `url(/wallpapers/${background})` }}
    >
      <div className="flex min-h-screen flex-col backdrop-blur-sm bg-black/40">
        <header className="flex justify-end gap-2 bg-black/60 px-4 py-2 text-sm">
          <select
            aria-label="Session"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="bg-gray-800 px-2 py-1"
          >
            {sessions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 px-2 py-1"
          >
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Keyboard layout"
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="bg-gray-800 px-2 py-1"
          >
            {layouts.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="bg-gray-800 px-2 py-1"
          >
            {backgrounds.map((b) => (
              <option key={b} value={b}>
                {b.replace(/\.webp$/, '')}
              </option>
            ))}
          </select>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="rounded bg-gray-900/70 p-6 shadow-lg">
            <ul className="mb-4 flex gap-2">
              {users.map((u) => (
                <li key={u.username}>
                  <button
                    type="button"
                    onClick={() => setUser(u)}
                    className={`rounded border px-4 py-2 hover:bg-gray-700 ${
                      u.username === user.username
                        ? 'bg-gray-700'
                        : 'bg-gray-800'
                    }`}
                  >
                    {u.name}
                  </button>
                </li>
              ))}
            </ul>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 focus:outline-none"
            />
            <button
              type="button"
              className="mt-4 w-full rounded bg-blue-600 px-4 py-2 hover:bg-blue-500"
            >
              Log In
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

