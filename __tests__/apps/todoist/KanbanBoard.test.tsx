import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import KanbanBoard, {
  KanbanColumn,
} from '../../../apps/todoist/components/KanbanBoard';

afterEach(() => {
  cleanup();
});

type Item = { id: string; label: string };

const createItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    label: `Task ${index}`,
  }));

const renderBoard = (items: Item[]) => {
  const column: KanbanColumn<Item> = {
    id: 'lane-1',
    title: 'Todo',
    items,
    itemHeight: 56,
    renderItem: (item) => (
      <div data-testid="lane-item" style={{ padding: '8px 12px' }}>
        {item.label}
      </div>
    ),
  };

  return render(
    <div style={{ width: 800, height: 600 }}>
      <KanbanBoard columns={[column]} />
    </div>,
  );
};

test('virtualizes lane items to avoid DOM bloat', async () => {
  const { container } = renderBoard(createItems(500));
  await waitFor(() => {
    const rendered = container.querySelectorAll('[data-testid="lane-item"]');
    expect(rendered.length).toBeLessThan(80);
  });
});

test('renders large payloads within a 16ms frame budget', () => {
  const items = createItems(1000);
  const overheadStart = performance.now();
  const overheadEnd = performance.now();
  const overhead = overheadEnd - overheadStart;
  const start = performance.now();
  renderBoard(items);
  const duration = performance.now() - start - overhead;
  expect(duration).toBeLessThan(16);
});
