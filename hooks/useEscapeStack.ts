import { useEffect, useRef } from 'react';

type EscapeHandler = () => void;

const escapeStack: EscapeHandler[] = [];
let isListening = false;

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  const handler = escapeStack[escapeStack.length - 1];
  if (!handler) return;
  event.preventDefault();
  handler();
};

const addListener = () => {
  if (isListening || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeyDown);
  isListening = true;
};

const removeListenerIfUnused = () => {
  if (!isListening || typeof window === 'undefined' || escapeStack.length > 0) {
    return;
  }
  window.removeEventListener('keydown', handleKeyDown);
  isListening = false;
};

export default function useEscapeStack(active: boolean, onClose: EscapeHandler) {
  const latestHandlerRef = useRef(onClose);

  useEffect(() => {
    latestHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    const handler = () => {
      latestHandlerRef.current();
    };

    addListener();
    escapeStack.push(handler);

    return () => {
      const index = escapeStack.lastIndexOf(handler);
      if (index !== -1) {
        escapeStack.splice(index, 1);
      }
      removeListenerIfUnused();
    };
  }, [active]);
}
