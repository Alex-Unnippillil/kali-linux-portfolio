'use client';

import { useEffect, useRef, useState } from 'react';
import CrossfadePlayer from './utils/crossfade';
import { fetchTimedLyrics, type LyricLine } from '../../player/lyrics';

interface LyricsProps {
  title: string;
  player: CrossfadePlayer | null;
}

const Lyrics = ({ title, player }: LyricsProps) => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchTimedLyrics(title).then((l) => {
      if (mounted) setLines(l);
    });
    return () => {
      mounted = false;
    };
  }, [title]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (!player) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = player.getCurrentTime();
      const idx = lines.findIndex((line, i) => {
        const next = lines[i + 1];
        return t >= line.time && (!next || t < next.time);
      });
      if (idx !== -1 && idx !== active) {
        setActive(idx);
        const el = containerRef.current?.children[idx] as HTMLElement;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, lines, active]);

  if (!lines.length) return null;

  return (
    <div
      ref={containerRef}
      className="h-40 overflow-auto text-sm mt-2 space-y-1"
    >
      {lines.map((l, i) => (
        <p key={i} className={i === active ? 'text-green-400' : ''}>
          {l.text}
        </p>
      ))}
    </div>
  );
};

export default Lyrics;

