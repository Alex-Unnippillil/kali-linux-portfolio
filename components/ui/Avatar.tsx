import { useState } from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({
  src,
  name = '',
  size = 64,
  className = '',
}: AvatarProps) {
  const [error, setError] = useState(false);

  if (src && !error) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setError(true)}
        className={`rounded-full object-cover bg-muted ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const hash = hashCode(name);
  const color = `hsl(${hash % 360}, 70%, 50%)`;
  const cell = size / 5;
  const blocks: JSX.Element[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if ((hash >> (x + y * 3)) & 1) {
        const px = x * cell;
        const py = y * cell;
        blocks.push(<rect key={`${x}-${y}`} x={px} y={py} width={cell} height={cell} />);
        const mx = (4 - x) * cell;
        blocks.push(<rect key={`${4 - x}-${y}`} x={mx} y={py} width={cell} height={cell} />);
      }
    }
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-muted text-text overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {name ? (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill={color}>
          {blocks}
        </svg>
      ) : (
        <span className="text-sm">?</span>
      )}
    </div>
  );
}

