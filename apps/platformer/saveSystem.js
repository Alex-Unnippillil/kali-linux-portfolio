const KEY = 'platformer-save';

export function saveGame(data) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
}

export function loadGame() {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }
  return null;
}
