import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Favorites, { FAVORITE_TOOLS } from '../../../apps/security-tools/components/Favorites';

describe('Favorites', () => {
  const storageKey = 'security-tools:favorites';

  const nameForId = (id: string) => FAVORITE_TOOLS.find((tool) => tool.id === id)?.name ?? '';

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  const getVisibleOrder = () =>
    screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('[data-testid^="favorite-name-"]')?.textContent ?? '')
      .map((text) => text.replace(/^\d+\.\s*/, ''));

  const createDataTransfer = () => ({
    data: new Map<string, string>(),
    dropEffect: 'move' as DataTransfer['dropEffect'],
    effectAllowed: 'all' as DataTransfer['effectAllowed'],
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as string[],
    setData(format: string, value: string) {
      this.data.set(format, value);
    },
    getData(format: string) {
      return this.data.get(format) ?? '';
    },
    clearData(format?: string) {
      if (!format) {
        this.data.clear();
      } else {
        this.data.delete(format);
      }
    },
    setDragImage: jest.fn(),
  }) as unknown as DataTransfer;

  it('loads persisted order from localStorage', async () => {
    const persistedOrder = [...FAVORITE_TOOLS].reverse().map((tool) => tool.id);
    window.localStorage.setItem(storageKey, JSON.stringify(persistedOrder));

    render(<Favorites />);

    await waitFor(() => {
      expect(getVisibleOrder()).toEqual(persistedOrder.map(nameForId));
    });
  });

  it('reorders items via drag and persists the new order', async () => {
    render(<Favorites />);

    const items = screen.getAllByRole('listitem');
    const first = items[0];
    const third = items[2];
    const data = createDataTransfer();

    fireEvent.dragStart(first, { dataTransfer: data });
    fireEvent.dragOver(third, { dataTransfer: data });
    fireEvent.drop(third, { dataTransfer: data });
    fireEvent.dragEnd(first, { dataTransfer: data });

    await waitFor(() => {
      const order = getVisibleOrder();
      expect(order[2]).toContain(FAVORITE_TOOLS[0].name);
    });

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
      expect(stored[2]).toBe(FAVORITE_TOOLS[0].id);
    });
  });
});
