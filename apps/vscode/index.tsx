'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import ExternalFrame from '../../components/ExternalFrame';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from '../../components/ToolbarIcons';
import TabBar from '../../components/ui/TabBar';
import { kaliTheme } from '../../styles/themes/kali';
import { SIDEBAR_WIDTH, ICON_SIZE } from './utils';

const DEFAULT_FILES = ['README.md', 'CHANGELOG.md', 'package.json'] as const;

export default function VsCode() {
  const [openFiles, setOpenFiles] = useState<string[]>(() => [...DEFAULT_FILES]);
  const [activeFile, setActiveFile] = useState<string>(DEFAULT_FILES[0]);

  const handleSelectFile = useCallback((id: string | number) => {
    setActiveFile(String(id));
  }, []);

  const handleCloseFile = useCallback(
    (id: string | number) => {
      setOpenFiles((prev) => {
        if (prev.length <= 1) return prev;
        const fileId = String(id);
        const index = prev.indexOf(fileId);
        if (index === -1) return prev;
        const next = prev.filter((file) => file !== fileId);
        setActiveFile((current) => {
          if (current !== fileId) return current;
          return next[index] ?? next[index - 1] ?? next[0] ?? current;
        });
        return next;
      });
    },
    [],
  );

  const handleReorderFiles = useCallback((sourceId: string | number, targetId: string | number) => {
    setOpenFiles((prev) => {
      const fromIdx = prev.indexOf(String(sourceId));
      const toIdx = prev.indexOf(String(targetId));
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const fileTabs = useMemo(
    () =>
      openFiles.map((file) => ({
        id: file,
        label: <span className="max-w-[160px] truncate">{file}</span>,
        closable: openFiles.length > 1,
        closeLabel: `Close ${file}`,
      })),
    [openFiles],
  );

  return (
    <div
      className="flex flex-col min-[1366px]:flex-row h-full w-full max-w-full"
      style={{ backgroundColor: kaliTheme.background, color: kaliTheme.text }}
    >
      <aside
        className="flex flex-col items-center gap-2 p-1"
        style={{ width: SIDEBAR_WIDTH, backgroundColor: kaliTheme.sidebar }}
      >
        <div
          className="rounded"
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            backgroundColor: kaliTheme.accent,
          }}
        />
        <div
          className="rounded"
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            backgroundColor: kaliTheme.accent,
          }}
        />
      </aside>
      <div className="flex-1 flex flex-col border border-black/20 rounded-md overflow-hidden">
        <div
          className="flex items-center justify-end gap-2 px-2 py-1 border-b border-black/20"
          style={{ backgroundColor: kaliTheme.background }}
        >
          <button aria-label="Minimize">
            <MinimizeIcon />
          </button>
          <button aria-label="Maximize">
            <MaximizeIcon />
          </button>
          <button aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <TabBar
          tabs={fileTabs}
          activeId={activeFile}
          onSelect={handleSelectFile}
          onClose={handleCloseFile}
          onReorder={handleReorderFiles}
          ariaLabel="Open files"
          className="bg-transparent"
        />
        <div className="relative flex-1" style={{ backgroundColor: kaliTheme.background }}>
          <ExternalFrame
            src={`https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=${encodeURIComponent(activeFile)}`}
            title="VsCode"
            className="w-full h-full"
            onLoad={() => {}}
          />
          <div className="absolute top-4 left-4 flex items-center gap-4 bg-black/50 p-4 rounded">
            <Image
              src="/themes/Yaru/system/view-app-grid-symbolic.svg"
              alt="Open Folder"
              width={64}
              height={64}
            />
            <span className="text-lg">Open Folder</span>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-2 py-1 border-t border-black/20"
          style={{ backgroundColor: kaliTheme.sidebar }}
        >
          <span className="flex items-center gap-1 text-[12px] uppercase bg-black/30 px-[6px] py-[2px] rounded-full">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            MAIN
          </span>
          <span className="flex items-center gap-1 text-[12px] uppercase bg-black/30 px-[6px] py-[2px] rounded-full">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            CHECKS
          </span>
        </div>
      </div>
    </div>
  );
}
