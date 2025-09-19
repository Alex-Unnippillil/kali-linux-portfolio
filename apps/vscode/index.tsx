'use client';

import ExternalFrame from '../../components/ExternalFrame';
import {
  BranchIcon,
  CheckIcon,
  CloseIcon,
  FolderIcon,
  MaximizeIcon,
  MinimizeIcon,
} from '../../components/ui/icons';
import { kaliTheme } from '../../styles/themes/kali';
import { SIDEBAR_WIDTH, ICON_SIZE } from './utils';

export default function VsCode() {
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
            <MinimizeIcon className="w-4 h-4" size={16} aria-hidden />
          </button>
          <button aria-label="Maximize">
            <MaximizeIcon className="w-4 h-4" size={16} aria-hidden />
          </button>
          <button aria-label="Close">
            <CloseIcon className="w-4 h-4" size={16} aria-hidden />
          </button>
        </div>
        <div className="relative flex-1" style={{ backgroundColor: kaliTheme.background }}>
          <ExternalFrame
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            title="VsCode"
            className="w-full h-full"
            onLoad={() => {}}
          />
          <div className="absolute top-4 left-4 flex items-center gap-4 bg-black/50 p-4 rounded">
            <FolderIcon className="w-16 h-16 text-white" size={64} aria-hidden />
            <span className="text-lg">Open Folder</span>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-2 py-1 border-t border-black/20"
          style={{ backgroundColor: kaliTheme.sidebar }}
        >
          <span className="flex items-center gap-1 text-[12px] uppercase bg-black/30 px-[6px] py-[2px] rounded-full">
            <BranchIcon className="w-3 h-3" size={12} aria-hidden />
            MAIN
          </span>
          <span className="flex items-center gap-1 text-[12px] uppercase bg-black/30 px-[6px] py-[2px] rounded-full">
            <CheckIcon className="w-3 h-3" size={12} aria-hidden />
            CHECKS
          </span>
        </div>
      </div>
    </div>
  );
}
