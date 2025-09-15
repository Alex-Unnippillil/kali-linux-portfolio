import { useSyncExternalStore } from 'react';

// Global motion policy merged from user preference and system setting
// The user preference is stored in localStorage under "reduced-motion".
// The system setting comes from the "prefers-reduced-motion" media query.

type Listener = () => void;

const listeners = new Set<Listener>();

let userSetting =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('reduced-motion') === 'true'
    : false;

let systemPrefers =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

let policy = userSetting || systemPrefers;

function emit() {
  const next = userSetting || systemPrefers;
  if (next !== policy) {
    policy = next;
    listeners.forEach((l) => l());
  }
}

if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    systemPrefers = e.matches;
    emit();
  });
}

export const motionPolicyAtom = {
  get: () => policy,
  set: (value: boolean) => {
    userSetting = value;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
    }
    emit();
  },
  subscribe: (fn: Listener) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export default function useMotionPolicy() {
  return useSyncExternalStore(motionPolicyAtom.subscribe, motionPolicyAtom.get);
}
