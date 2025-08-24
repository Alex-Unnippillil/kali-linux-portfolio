'use client';
import { useEffect, useState } from 'react';

// IndexedDB helpers
const DB_NAME = 'game-scores';
const STORE_NAME = 'scores';

interface ScoreEntry {
  score: number;
  date: string; // ISO string
  session: string;
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = String(Date.now());
    }
  }
  return sessionId;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function saveScore(value: number): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const entry: ScoreEntry = {
    score: value,
    date: new Date().toISOString(),
    session: getSessionId(),
  };
  store.add(entry);
}

export async function getScores(): Promise<ScoreEntry[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const data = (req.result as ScoreEntry[]) || [];
      resolve(data);
    };
    req.onerror = () => resolve([]);
  });
}

export async function resetScores(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
}

export async function getHighScore(): Promise<number> {
  const scores = await getScores();
  return scores.reduce((max, s) => (s.score > max ? s.score : max), 0);
}

export async function generateShareImage(): Promise<string> {
  if (typeof document === 'undefined') return '';
  const scores = await getScores();
  const start = performance.now();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  canvas.width = 400;
  canvas.height = 40 + scores.length * 20;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = '16px sans-serif';
  ctx.fillText('Scores', 10, 20);
  scores.forEach((s, i) => {
    ctx.fillText(`${s.score} - ${s.date} (${s.session})`, 10, 40 + i * 20);
  });
  const url = canvas.toDataURL('image/png');
  const elapsed = performance.now() - start;
  if (elapsed > 300) {
    console.warn(`share image generation took ${elapsed}ms`);
  }
  return url;
}

export function useScore() {
  const [score, setScore] = useState(0);

  useEffect(() => {
    getHighScore().then(setScore);
  }, []);

  const update = async (value: number) => {
    await saveScore(value);
    const high = await getHighScore();
    setScore(high);
  };

  const reset = async () => {
    await resetScores();
    setScore(0);
  };

  return { score, update, reset };
}

export type { ScoreEntry };
