import { useEffect } from 'react';
import { consumeGameKey, shouldHandleGameKey } from '../../../../utils/gameInput';
import { PlayerAction } from '../domain/types';

type Args = {
  isFocused: boolean;
  onAction: (action: PlayerAction) => void;
  onNewRound: () => void;
  onBetAdjust: (delta: number) => void;
  closeOverlay: () => void;
};

export const useKeyboardControls = ({ isFocused, onAction, onNewRound, onBetAdjust, closeOverlay }: Args) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      const key = event.key.toLowerCase();
      let handled = true;
      if (key === 'h') onAction('HIT');
      else if (key === 's') onAction('STAND');
      else if (key === 'd') onAction('DOUBLE');
      else if (key === 'p') onAction('SPLIT');
      else if (key === 'n') onNewRound();
      else if (key === 'b' && event.shiftKey) onBetAdjust(-5);
      else if (key === 'b') onBetAdjust(5);
      else if (event.key === 'Escape') closeOverlay();
      else handled = false;

      if (handled) consumeGameKey(event as unknown as Event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOverlay, isFocused, onAction, onBetAdjust, onNewRound]);
};
