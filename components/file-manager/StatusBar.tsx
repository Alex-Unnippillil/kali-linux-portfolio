'use client';

import { useEffect, useState } from 'react';

export interface FileItem {
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  children?: FileItem[];
}

interface StatusBarProps {
  selectedItems: FileItem[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const fixed = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${fixed} ${sizes[i]}`;
}

async function calculateSize(item: FileItem): Promise<number> {
  if (item.kind === 'file') {
    return item.size || 0;
  }
  // Simulate async folder size calculation
  let total = 0;
  if (item.children && item.children.length > 0) {
    for (const child of item.children) {
      total += await calculateSize(child);
    }
  }
  // Simulate delay to mimic disk access
  await new Promise((res) => setTimeout(res, 0));
  return total;
}

async function calculateTotal(items: FileItem[]): Promise<number> {
  let total = 0;
  for (const item of items) {
    total += await calculateSize(item);
  }
  return total;
}

export default function StatusBar({ selectedItems }: StatusBarProps) {
  const [size, setSize] = useState(0);

  useEffect(() => {
    let cancelled = false;
    calculateTotal(selectedItems).then((s) => {
      if (!cancelled) setSize(s);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedItems]);

  const count = selectedItems.length;
  const label =
    count === 0 ? 'No items selected' : `${count} item${count === 1 ? '' : 's'} selected`;
  return (
    <div className="w-full px-2 py-1 border-t border-gray-600 flex justify-between text-xs text-white bg-ub-warm-grey bg-opacity-40">
      <span>{label}</span>
      <span>{formatBytes(size)}</span>
    </div>
  );
}

