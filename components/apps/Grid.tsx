import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid, type GridImperativeAPI, type CellComponentProps } from 'react-window';

import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import { useSettings, type Density } from '../../hooks/useSettings';

interface AppConfig {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
}

interface HighlightedApp extends AppConfig {
  nodes: ReactNode;
}

interface AppGridProps {
  openApp?: (id: string) => void;
}

interface GridCellProps {
  items: HighlightedApp[];
  columnCount: number;
  gap: number;
  openApp?: (id: string) => void;
}

const DENSITY_PRESETS: Record<Density, { itemWidth: number; itemHeight: number; gap: number }> = {
  comfortable: { itemWidth: 208, itemHeight: 128, gap: 24 },
  cozy: { itemWidth: 176, itemHeight: 116, gap: 20 },
  compact: { itemWidth: 152, itemHeight: 104, gap: 16 },
};

function fuzzyHighlight(text: string, query: string): { matched: boolean; nodes: ReactNode } {
  const normalized = query.toLowerCase();
  let matchIndex = 0;
  const nodes: ReactNode[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (matchIndex < normalized.length && character.toLowerCase() === normalized[matchIndex]) {
      nodes.push(
        <mark key={`${text}-${i}`}>{character}</mark>,
      );
      matchIndex += 1;
    } else {
      nodes.push(character);
    }
  }
  return { matched: matchIndex === normalized.length, nodes };
}

const Cell = ({
  columnIndex,
  rowIndex,
  style,
  items,
  columnCount,
  gap,
  openApp,
}: CellComponentProps<GridCellProps>) => {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= items.length) return null;
  const app = items[index];
  const padding = gap / 2;
  const cellStyle: CSSProperties = {
    ...style,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding,
    boxSizing: 'border-box',
  };

  return (
    <div style={cellStyle}>
      <UbuntuApp
        id={app.id}
        icon={app.icon}
        name={app.title}
        displayName={<>{app.nodes}</>}
        openApp={() => openApp && openApp(app.id)}
      />
    </div>
  );
};

const AppGrid = ({ openApp }: AppGridProps) => {
  const { density } = useSettings();
  const [query, setQuery] = useState('');
  const gridRef = useRef<GridImperativeAPI | null>(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) {
      return apps.map((app: AppConfig) => ({ ...app, nodes: app.title })) as HighlightedApp[];
    }
    return (
      apps
        .map((app: AppConfig) => {
          const { matched, nodes } = fuzzyHighlight(app.title, query);
          return matched ? { ...app, nodes } : null;
        })
        .filter((value): value is HighlightedApp => Boolean(value))
    );
  }, [query]);

  useEffect(() => {
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
    }
  }, [filtered, focusedIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const columnCount = columnCountRef.current;
      let index = focusedIndex;
      if (event.key === 'ArrowRight') index = Math.min(index + 1, filtered.length - 1);
      if (event.key === 'ArrowLeft') index = Math.max(index - 1, 0);
      if (event.key === 'ArrowDown') index = Math.min(index + columnCount, filtered.length - 1);
      if (event.key === 'ArrowUp') index = Math.max(index - columnCount, 0);
      setFocusedIndex(index);
      const row = Math.floor(index / columnCount);
      const column = index % columnCount;
      gridRef.current?.scrollToCell({
        rowIndex: row,
        columnIndex: column,
        rowAlign: 'smart',
        columnAlign: 'smart',
      });
      setTimeout(() => {
        const element = document.getElementById(`app-${filtered[index]?.id}`);
        element?.focus();
      }, 0);
    },
    [filtered, focusedIndex],
  );

  return (
    <div className="flex h-full flex-col items-center">
      <input
        className="mb-6 mt-4 w-2/3 rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none md:w-1/3"
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search applications"
      />
      <div className="h-[70vh] w-full flex-1 outline-none" onKeyDown={handleKeyDown}>
        <AutoSizer>
          {({ height, width }) => {
            if (!width || !height) {
              return null;
            }
            const preset = DENSITY_PRESETS[density];
            const { itemWidth, itemHeight, gap } = preset;
            const columnCount = Math.max(1, Math.floor((width + gap) / (itemWidth + gap)));
            const rowCount = Math.ceil(filtered.length / columnCount);
            columnCountRef.current = columnCount;
            const columnWidth = width / columnCount;
            const rowHeight = itemHeight + gap;

            return (
              <Grid
                gridRef={gridRef}
                className="scroll-smooth"
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
                defaultHeight={height}
                defaultWidth={width}
                style={{ width, height }}
                cellComponent={Cell}
                cellProps={{
                  items: filtered,
                  columnCount,
                  gap,
                  openApp,
                }}
              />
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
};

export default AppGrid;
