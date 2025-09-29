'use client';

import { useEffect, useRef, useState } from 'react';
import CrossfadePlayer from './utils/crossfade';
import { fetchTimedLyrics, LyricLine } from '../../player/lyrics';
import createGameLoop from '../../utils/animation';

interface LyricsProps {
  title: string;
  player: CrossfadePlayer | null;
}

const Lyrics = ({ title, player }: LyricsProps) => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const linesRef = useRef<LyricLine[]>([]);
  const playerRef = useRef<CrossfadePlayer | null>(player);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

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
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const loop = createGameLoop({
      update: () => {
        const currentPlayer = playerRef.current;
        const currentLines = linesRef.current;
        if (!currentPlayer || !currentLines.length) {
          return;
        }
        const t = currentPlayer.getCurrentTime();
        const idx = currentLines.findIndex((line, i) => {
          const next = currentLines[i + 1];
          return t >= line.time && (!next || t < next.time);
        });
        if (idx !== -1 && idx !== activeRef.current) {
          activeRef.current = idx;
          setActive(idx);
          const el = containerRef.current?.children[idx] as HTMLElement | undefined;
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
    });

    return () => loop.stop();
  }, []);

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

