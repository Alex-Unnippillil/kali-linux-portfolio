import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { generateGrid } from './generator';
import type { Position } from './types';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { findWord } from './utils';

const GRID_SIZE = 12;

function key(p: Position) {
  return `${p.row}-${p.col}`;
}

function computePath(start: Position, end: Position): Position[] {
  const dx = Math.sign(end.col - start.col);
  const dy = Math.sign(end.row - start.row);
  const len = Math.max(
    Math.abs(end.col - start.col),
    Math.abs(end.row - start.row)
  );
  if (
    dx !== 0 &&
    dy !== 0 &&
    Math.abs(end.col - start.col) !== Math.abs(end.row - start.row)
  ) {
    return [start];
  }
  const path: Position[] = [];
  for (let i = 0; i <= len; i += 1) {
    path.push({ row: start.row + dy * i, col: start.col + dx * i });
  }
  return path;
}

const WordSearch: React.FC = () => {
  const router = useRouter();
  const [packs, setPacks] = useState<{ id: string; name: string }[]>([]);
  const [theme, setTheme] = useState('');
  const [seed, setSeed] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<Position | null>(null);
  const [selection, setSelection] = useState<Position[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dailySeed = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.theme === 'string') setTheme(q.theme);
    if (typeof q.seed === 'string') setSeed(q.seed);
    if (typeof q.words === 'string') {
      const qs = q.words
        .split(',')
        .map((w) => w.toUpperCase())
        .filter(Boolean);
      setWords(qs);
    }
  }, [router.isReady]);

  useEffect(() => {
    fetch('/wordlists/packs.json')
      .then((res) => res.json())
      .then((data) => {
        const arr = Object.entries(data as Record<string, string>).map(
          ([id, name]) => ({
            id,
            name,
          })
        );
        setPacks(arr);
        if (!router.query.theme && arr.length) setTheme(arr[0].id);
      });
  }, [router.query.theme]);

  useEffect(() => {
    if (!theme) return;
    fetch(`/wordlists/${theme}.txt`)
      .then((res) => res.text())
      .then((text) => {
        const all = text
          .split(/\r?\n/)
          .map((w) => w.trim().toUpperCase())
          .filter(Boolean);
        if (!words.length) {
          const shuffled = all.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, Math.min(10, shuffled.length));
          setWords(selected);
          if (!seed) setSeed(Math.random().toString(36).slice(2));
        }
      });
  }, [theme, words.length, seed]);

  const storageKey = `${theme}-${seed}`;

  useEffect(() => {
    if (!router.isReady || !theme || !seed || !words.length) return;
    router.replace(
      {
        pathname: router.pathname,
        query: { theme, seed, words: words.join(',') },
      },
      undefined,
      { shallow: true }
    );
  }, [router, theme, seed, words]);

  useEffect(() => {
    if (!seed || !words.length) return;
    const { grid: g } = generateGrid(words, GRID_SIZE, seed);
    setGrid(g);

    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(`word-search-${storageKey}`)
        : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFound(new Set(parsed.found || []));
        setFoundCells(new Set(parsed.foundCells || []));
        setStartTime(parsed.startTime || Date.now());
        return;
      } catch {
        // ignore
      }
    }
    const now = Date.now();
    setFound(new Set());
    setFoundCells(new Set());
    setStartTime(now);
    window.localStorage.setItem(
      `word-search-${storageKey}`,
      JSON.stringify({ found: [], foundCells: [], startTime: now })
    );
  }, [seed, words, storageKey]);

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  useEffect(() => {
    if (!startTime) return;
    window.localStorage.setItem(
      `word-search-${storageKey}`,
      JSON.stringify({
        found: Array.from(found),
        foundCells: Array.from(foundCells),
        startTime,
      })
    );
  }, [found, foundCells, startTime, storageKey]);

  useEffect(() => {
    if (found.size === words.length && words.length) {
      window.localStorage.setItem(
        `word-search-${storageKey}-completed`,
        JSON.stringify({ time: Date.now() - startTime })
      );
    }
  }, [found, words.length, startTime, storageKey]);

  const handleMouseDown = (r: number, c: number) => {
    setSelecting(true);
    const s = { row: r, col: c };
    setStart(s);
    setSelection([s]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!selecting || !start) return;
    const path = computePath(start, { row: r, col: c });
    setSelection(path);
  };

  const handleMouseUp = () => {
    if (!selecting) return;
    setSelecting(false);
    if (!selection.length) {
      setStart(null);
      setSelection([]);
      return;
    }
    const match = findWord(grid, words, selection);
    if (match && !found.has(match)) {
      const newFound = new Set(found);
      newFound.add(match);
      setFound(newFound);
      const newCells = new Set(foundCells);
      selection.forEach((p) => newCells.add(key(p)));
      setFoundCells(newCells);
    }
    setStart(null);
    setSelection([]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!selecting) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    ) as HTMLElement | null;
    const pos = target?.dataset?.pos;
    if (!pos) return;
    const [r, c] = pos.split('-').map(Number);
    handleMouseEnter(r, c);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const newPuzzle = () => {
    setSeed(Math.random().toString(36).slice(2));
  };

  const dailyPuzzle = () => {
    setSeed(dailySeed());
  };

  const exportPDF = async () => {
    if (!containerRef.current) return;
    const dataUrl = await toPng(containerRef.current);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`word-search-${theme}.pdf`);
  };

  const printPuzzle = () => {
    window.print();
  };

  const sharePuzzle = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Word Search', url });
      } catch {
        // ignore share cancellation
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const importWords = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const arr = text
        .split(/\r?\n/)
        .map((w) => w.trim().toUpperCase())
        .filter(Boolean);
      setWords(arr.slice(0, 20));
      setSeed(Math.random().toString(36).slice(2));
    });
  };

  const exportWords = () => {
    const blob = new Blob([words.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'words.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const moveFocus = (r: number, c: number, dr: number, dc: number) => {
    const nr = Math.max(0, Math.min(GRID_SIZE - 1, r + dr));
    const nc = Math.max(0, Math.min(GRID_SIZE - 1, c + dc));
    const el = document.querySelector<HTMLElement>(`[data-pos="${nr}-${nc}"]`);
    el?.focus();
    handleMouseEnter(nr, nc);
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(r, c, -1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(r, c, 1, 0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(r, c, 0, -1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(r, c, 0, 1);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (!selecting) handleMouseDown(r, c);
        else handleMouseUp();
        break;
      }
    }
  };

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      className="p-4 select-none"
      ref={containerRef}
      id="word-search-container"
    >
      <div className="flex flex-wrap space-x-2 mb-2 print:hidden">
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={importWords}
        />
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-2 py-1 border rounded mb-2"
        >
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={newPuzzle}
          aria-label="New puzzle"
          className="px-2 py-1 bg-blue-600 text-white rounded"
        >
          New
        </button>
        <button
          type="button"
          onClick={dailyPuzzle}
          aria-label="Daily puzzle"
          className="px-2 py-1 bg-purple-600 text-white rounded"
        >
          Daily
        </button>
        <button
          type="button"
          onClick={exportPDF}
          aria-label="Export PDF"
          className="px-2 py-1 bg-gray-600 text-white rounded"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={printPuzzle}
          aria-label="Print puzzle"
          className="px-2 py-1 bg-indigo-600 text-white rounded"
        >
          Print
        </button>
        <button
          type="button"
          onClick={sharePuzzle}
          aria-label="Share puzzle"
          className="px-2 py-1 bg-pink-600 text-white rounded"
        >
          Share
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Import words"
          className="px-2 py-1 bg-green-600 text-white rounded"
        >
          Import
        </button>
        <button
          type="button"
          onClick={exportWords}
          aria-label="Export words"
          className="px-2 py-1 bg-yellow-600 text-white rounded"
        >
          Export
        </button>
        <span className="px-2 py-1">{formatTime(elapsed)}</span>
      </div>
      <div
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 2rem)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 2rem)`,
        }}
        className="grid border w-max"
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const posKey = key({ row: r, col: c });
            const isSelected = selection.some(
              (p) => p.row === r && p.col === c
            );
            const isFound = foundCells.has(posKey);
            return (
              <button
                type="button"
                key={posKey}
                data-pos={posKey}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseUp={handleMouseUp}
                onKeyDown={(e) => handleKeyDown(r, c, e)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleMouseDown(r, c);
                }}
                className={`w-8 h-8 flex items-center justify-center border text-sm font-bold cursor-pointer select-none focus:outline-none ${
                  isFound
                    ? 'bg-green-300'
                    : isSelected
                      ? 'bg-yellow-300'
                      : 'bg-white'
                }`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>
      {found.size > 0 && (
        <div className="mt-4">
          <h3 className="font-bold">Found</h3>
          <ul className="columns-2 md:columns-3 mb-2">
            {Array.from(found).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mt-4 columns-2 md:columns-3">
        {words.map((w) => (
          <li
            key={w}
            className={found.has(w) ? 'line-through text-gray-500' : ''}
          >
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WordSearch;
