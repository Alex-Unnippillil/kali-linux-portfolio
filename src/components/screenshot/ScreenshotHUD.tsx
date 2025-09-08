import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface Props {
  onClose: () => void;
}

const ScreenshotHUD: React.FC<Props> = ({ onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setStart({ x: e.clientX, y: e.clientY });
    setEnd(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (start) {
      setEnd({ x: e.clientX, y: e.clientY });
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'screenshot.png';
    link.click();
  };

  const handleMouseUp = async () => {
    if (start && end) {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(start.x - end.x);
      const height = Math.abs(start.y - end.y);
      const canvas = await html2canvas(document.body, {
        x,
        y,
        width,
        height,
      });
      downloadCanvas(canvas);
    }
    onClose();
  };

  const rect = start && end ? {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(start.x - end.x),
    height: Math.abs(start.y - end.y),
  } : undefined;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] cursor-crosshair bg-black/50"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      data-testid="screenshot-hud"
    >
      {rect && (
        <div
          className="absolute border border-[var(--color-accent)]"
          style={rect}
          data-testid="selection-region"
        />
      )}
    </div>
  );
};

export default ScreenshotHUD;
