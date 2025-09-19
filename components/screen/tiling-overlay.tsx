import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type TilingTemplateOption = {
  id: string;
  label: string;
  rows: number;
  cols: number;
};

const TEMPLATE_OPTIONS: TilingTemplateOption[] = [
  { id: '2x2', label: '2 × 2', rows: 2, cols: 2 },
  { id: '1x3', label: '1 × 3', rows: 1, cols: 3 },
  { id: '2x3', label: '2 × 3', rows: 2, cols: 3 },
];

export interface TilingOverlayProps {
  visible: boolean;
  onSelect(option: TilingTemplateOption): void;
  onCancel(): void;
  activeTemplateId?: string | null;
}

const previewCellClass =
  'border border-white border-opacity-30 bg-white bg-opacity-10 rounded-sm';

const TilingOverlay: React.FC<TilingOverlayProps> = ({
  visible,
  onSelect,
  onCancel,
  activeTemplateId,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, onCancel]);

  const options = useMemo(() => TEMPLATE_OPTIONS, []);

  if (!mounted || !visible) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose window tiling layout"
        className="w-full max-w-md rounded-lg border border-white border-opacity-20 bg-gray-900 bg-opacity-95 p-6 text-white shadow-xl"
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Tiling layouts</h2>
          <p className="text-sm text-gray-200 text-opacity-80">
            Pick a grid to place the active window. The layout will be reused for
            the next window you tile.
          </p>
        </div>
        <div className="grid gap-4">
          {options.map((option) => {
            const isActive = option.id === activeTemplateId;
            return (
              <button
                key={option.id}
                type="button"
                data-template={option.id}
                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isActive
                    ? 'border-blue-400 bg-blue-500 bg-opacity-20'
                    : 'border-white border-opacity-20 hover:border-blue-300 hover:bg-white hover:bg-opacity-10'
                }`}
                onClick={() => onSelect(option)}
              >
                <div>
                  <div className="text-base font-medium">{option.label}</div>
                  <div className="text-xs text-gray-300">
                    {option.rows} row{option.rows > 1 ? 's' : ''} × {option.cols}
                    {' '}
                    column{option.cols > 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="ml-4 grid gap-1"
                  style={{ gridTemplateRows: `repeat(${option.rows}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${option.cols}, minmax(0, 1fr))`, width: '4.5rem', height: '3rem' }}
                  aria-hidden="true"
                >
                  {Array.from({ length: option.rows * option.cols }).map((_, index) => (
                    <div key={index} className={previewCellClass} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-white border-opacity-20 px-4 py-2 text-sm hover:border-blue-300 hover:bg-white hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default TilingOverlay;
