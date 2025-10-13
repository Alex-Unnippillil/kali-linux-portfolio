export function exportGameSettings(game: string): string {
  if (typeof window === 'undefined') return '{}';
  const data: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(`${game}:`)) {
      try {
        const value = window.localStorage.getItem(key);
        data[key.slice(game.length + 1)] = value ? JSON.parse(value) : null;
      } catch {
        // ignore parsing errors
      }
    }
  }
  return JSON.stringify(data);
}

export function importGameSettings(game: string, json: string): void {
  if (typeof window === 'undefined') return;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    return;
  }
  Object.entries(parsed).forEach(([k, v]) => {
    try {
      window.localStorage.setItem(`${game}:${k}`, JSON.stringify(v));
    } catch {
      // ignore write errors
    }
  });
}
