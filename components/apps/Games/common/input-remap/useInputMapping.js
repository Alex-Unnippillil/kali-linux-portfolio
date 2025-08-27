import usePersistedState from '../../../../../hooks/usePersistedState';

export const getMapping = (gameId, defaults = {}) => {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(`controls:${gameId}`);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
};

export default function useInputMapping(gameId, defaults = {}) {
  const [mapping, setMapping] = usePersistedState(`controls:${gameId}`, getMapping(gameId, defaults));

  const setKey = (action, key) => {
    let conflict = null;
    setMapping((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((a) => {
        if (a !== action && next[a] === key) {
          conflict = a;
          delete next[a];
        }
      });
      next[action] = key;
      return next;
    });
    return conflict;
  };

  return [mapping, setKey];
}
