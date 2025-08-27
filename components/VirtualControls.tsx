import React, { useEffect } from 'react';
import { useVirtualControls } from '../hooks/useVirtualControls';

interface Props {
  onInput?: (dir: string) => void;
  timeout?: number;
}

/**
 * On-screen directional controls for touch devices. Automatically hides when
 * inactive and reappears on user interaction.
 */
const VirtualControls: React.FC<Props> = ({ onInput, timeout }) => {
  const { visible, show } = useVirtualControls(timeout);

  useEffect(() => {
    const handler = () => show();
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="virtual-controls fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2"
      data-testid="virtual-controls"
    >
      <button onClick={() => onInput?.('left')} aria-label="left">
        ←
      </button>
      <button onClick={() => onInput?.('up')} aria-label="up">
        ↑
      </button>
      <button onClick={() => onInput?.('down')} aria-label="down">
        ↓
      </button>
      <button onClick={() => onInput?.('right')} aria-label="right">
        →
      </button>
    </div>
  );
};

export default VirtualControls;
