import { useRef, useState } from 'react';

interface Box {
  width: number;
  height: number;
  top: number;
  left: number;
}

const MIN_SIZE = 50;

export default function ResizableHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box>({ width: 100, height: 100, top: 0, left: 0 });
  const start = useRef<{ x: number; y: number; box: Box; corner: string } | null>(null);

  const onPointerMove = (e: PointerEvent) => {
    if (!start.current || !heroRef.current) return;
    const { x, y, box: startBox, corner } = start.current;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    let { width, height, top, left } = startBox;
    const bounds = heroRef.current.getBoundingClientRect();
    if (corner.includes('e')) {
      width = Math.max(MIN_SIZE, Math.min(startBox.width + dx, bounds.width - left));
    }
    if (corner.includes('s')) {
      height = Math.max(MIN_SIZE, Math.min(startBox.height + dy, bounds.height - top));
    }
    if (corner.includes('w')) {
      width = Math.max(MIN_SIZE, Math.min(startBox.width - dx, startBox.width + left));
      left = Math.max(0, startBox.left + dx);
    }
    if (corner.includes('n')) {
      height = Math.max(MIN_SIZE, Math.min(startBox.height - dy, startBox.height + top));
      top = Math.max(0, startBox.top + dy);
    }
    setBox({ width, height, top, left });
  };

  const stopResize = () => {
    start.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
  };

  const startResize = (corner: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    start.current = { x: e.clientX, y: e.clientY, box, corner };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
  };

  return (
    <div ref={heroRef} id="hero" className="relative w-full h-full">
      <div
        style={{ width: box.width, height: box.height, top: box.top, left: box.left }}
        className="absolute border border-blue-500 box-border"
        data-testid="resize-box"
      >
        {['nw', 'ne', 'sw', 'se'].map((corner) => (
          <div
            key={corner}
            className={
              'absolute w-3 h-3 bg-blue-500 ' +
              (corner === 'nw'
                ? 'cursor-nwse-resize top-0 left-0'
                : corner === 'ne'
                ? 'cursor-nesw-resize top-0 right-0'
                : corner === 'sw'
                ? 'cursor-nesw-resize bottom-0 left-0'
                : 'cursor-nwse-resize bottom-0 right-0')
            }
            onPointerDown={(e) => startResize(corner, e)}
          />
        ))}
      </div>
    </div>
  );
}

