import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualPacketRow {
  no: number;
  timeDisplay: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
}

export interface VirtualPacketTableProps {
  columns: string[];
  rows: VirtualPacketRow[];
  gridTemplateColumns: string;
  selectedNo: number | null;
  onSelect: (row: VirtualPacketRow) => void;
  estimateSize?: number;
  overscan?: number;
  getRowClassName?: (row: VirtualPacketRow, isSelected: boolean) => string;
}

const defaultCellAccessors: Record<string, (row: VirtualPacketRow) => string> = {
  'No.': (row) => row.no.toString(),
  Time: (row) => row.timeDisplay,
  Source: (row) => row.source,
  Destination: (row) => row.destination,
  Protocol: (row) => row.protocol,
  Length: (row) => row.length.toString(),
  Info: (row) => row.info,
};

const VirtualPacketTable: React.FC<VirtualPacketTableProps> = ({
  columns,
  rows,
  gridTemplateColumns,
  selectedNo,
  onSelect,
  estimateSize = 28,
  overscan = 8,
  getRowClassName,
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const totalSize = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  const baseRowClass = useMemo(
    () =>
      'grid text-xs font-mono px-1 py-1 border-b border-gray-800 hover:bg-gray-700 cursor-pointer',
    []
  );

  return (
    <div ref={parentRef} className="overflow-auto h-full" role="rowgroup">
      <div
        style={{ height: totalSize }}
        className="relative"
      >
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          const isSelected = selectedNo === row.no;
          const rowClassName = getRowClassName
            ? getRowClassName(row, isSelected)
            : `${baseRowClass} ${isSelected ? 'bg-gray-600' : ''}`;
          return (
            <div
              key={row.no}
              role="row"
              aria-selected={isSelected}
              className={rowClassName}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                gridTemplateColumns,
              }}
              onClick={() => onSelect(row)}
            >
              {columns.map((column) => (
                <div
                  key={column}
                  role="cell"
                  className="px-1 whitespace-nowrap overflow-hidden text-ellipsis"
                  title={defaultCellAccessors[column]?.(row) ?? ''}
                >
                  {defaultCellAccessors[column]?.(row) ?? ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualPacketTable;
