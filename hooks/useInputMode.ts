import { useEffect, useMemo, useRef, useState } from 'react';

export type PointerType = 'mouse' | 'touch' | 'pen' | 'unknown';
export type InputMode = 'keyboard' | 'pointer';

interface UseInputModeOptions {
  pointerOverride?: PointerType | null;
}

const getInitialPointerType = (): PointerType => {
  if (typeof window === 'undefined') return 'mouse';
  if (window.matchMedia('(pointer: coarse)').matches) return 'touch';
  if (window.matchMedia('(hover: none)').matches) return 'touch';
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return 'touch';
  return 'mouse';
};

const normalizePointer = (type?: string | null): PointerType => {
  switch (type) {
    case 'touch':
      return 'touch';
    case 'pen':
      return 'pen';
    case 'mouse':
      return 'mouse';
    default:
      return 'unknown';
  }
};

export default function useInputMode({ pointerOverride = null }: UseInputModeOptions = {}) {
  const [pointerType, setPointerType] = useState<PointerType>(() => pointerOverride ?? getInitialPointerType());
  const [inputMode, setInputMode] = useState<InputMode>('pointer');
  const lastPointer = useRef<PointerType>(pointerType);

  useEffect(() => {
    if (pointerOverride) {
      lastPointer.current = pointerOverride;
      setPointerType(pointerOverride);
      setInputMode('pointer');
      return;
    }

    if (typeof window === 'undefined') return;

    const updatePointer = (next: PointerType) => {
      if (lastPointer.current === next) return;
      lastPointer.current = next;
      setPointerType(next);
    };

    const handlePointer = (event: PointerEvent) => {
      const next = normalizePointer(event.pointerType);
      setInputMode('pointer');
      if (next === 'unknown') return;
      updatePointer(next);
    };

    const handleTouch = () => {
      setInputMode('pointer');
      updatePointer('touch');
    };

    const handleMouse = () => {
      setInputMode('pointer');
      updatePointer('mouse');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.altKey || event.ctrlKey) return;
      setInputMode('keyboard');
    };

    window.addEventListener('pointerdown', handlePointer, { passive: true });
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('mousemove', handleMouse, { passive: true });
    window.addEventListener('keydown', handleKeyDown, true);

    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const fineQuery = window.matchMedia('(pointer: fine)');

    const handleCoarseChange = (event: MediaQueryListEvent) => {
      if (pointerOverride) return;
      if (event.matches) updatePointer('touch');
    };

    const handleFineChange = (event: MediaQueryListEvent) => {
      if (pointerOverride) return;
      if (event.matches && lastPointer.current !== 'mouse') updatePointer('mouse');
    };

    coarseQuery.addEventListener('change', handleCoarseChange);
    fineQuery.addEventListener('change', handleFineChange);

    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('keydown', handleKeyDown, true);
      coarseQuery.removeEventListener('change', handleCoarseChange);
      fineQuery.removeEventListener('change', handleFineChange);
    };
  }, [pointerOverride]);

  useEffect(() => {
    if (!pointerOverride) return;
    lastPointer.current = pointerOverride;
    setPointerType(pointerOverride);
    setInputMode('pointer');
  }, [pointerOverride]);

  return useMemo(
    () => ({
      inputMode,
      pointerType,
      isKeyboard: inputMode === 'keyboard',
      isTouchPointer: pointerType === 'touch',
    }),
    [inputMode, pointerType],
  );
}
