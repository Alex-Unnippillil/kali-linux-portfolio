import { useState, useEffect, useRef } from 'react';

interface Wall {
  type: 'wall';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bumper {
  type: 'bumper';
  x: number;
  y: number;
  radius: number;
}

export type TableObject = Wall | Bumper;

function encode(objects: TableObject[]): string {
  return btoa(JSON.stringify(objects));
}

function decode(code: string): TableObject[] {
  try {
    return JSON.parse(atob(code));
  } catch {
    return [];
  }
}

export default function TableEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<TableObject[]>([]);
  const [tool, setTool] = useState<'wall' | 'bumper'>('wall');
  const [code, setCode] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach((obj) => {
      ctx.beginPath();
      if (obj.type === 'wall') {
        ctx.fillStyle = '#888';
        ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      } else {
        ctx.fillStyle = '#eab308';
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [objects]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setObjects((prev) => {
      const next: TableObject =
        tool === 'wall'
          ? { type: 'wall', x, y, width: 60, height: 20 }
          : { type: 'bumper', x, y, radius: 15 };
      return [...prev, next];
    });
  }

  function handleExport() {
    setCode(encode(objects));
  }

  function handleImport() {
    setObjects(decode(code));
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-2 text-xs">
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            name="tool"
            value="wall"
            checked={tool === 'wall'}
            onChange={() => setTool('wall')}
          />
          <span>Wall</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            name="tool"
            value="bumper"
            checked={tool === 'bumper'}
            onChange={() => setTool('bumper')}
          />
          <span>Bumper</span>
        </label>
        <button
          className="border px-2"
          type="button"
          onClick={() => setObjects([])}
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="border"
        onClick={handleClick}
      />
      <div className="flex flex-col text-xs space-y-1">
        <button className="border px-2" type="button" onClick={handleExport}>
          Export Code
        </button>
        <textarea
          className="border p-1"
          rows={3}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="border px-2" type="button" onClick={handleImport}>
          Import Code
        </button>
      </div>
    </div>
  );
}

