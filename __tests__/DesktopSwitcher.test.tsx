import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import DesktopSwitcher, {
  WINDOW_DRAG_JSON,
  WINDOW_DRAG_TYPE,
} from '../components/desktop/DesktopSwitcher';

type DataMap = Record<string, string>;

function createDataTransfer(initial: DataMap = {}): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];

  const dataTransfer: Partial<DataTransfer> = {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types,
    setData(type: string, value: string) {
      store.set(type, value);
      if (!types.includes(type)) {
        types.push(type);
      }
    },
    getData(type: string) {
      return store.get(type) ?? '';
    },
    clearData(type?: string) {
      if (typeof type === 'string') {
        store.delete(type);
        const index = types.indexOf(type);
        if (index !== -1) {
          types.splice(index, 1);
        }
      } else {
        store.clear();
        types.splice(0, types.length);
      }
    },
  };

  Object.entries(initial).forEach(([type, value]) => {
    dataTransfer.setData?.(type, value);
  });

  return dataTransfer as DataTransfer;
}

describe('DesktopSwitcher', () => {
  it('highlights the create-desktop drop zone when a window thumbnail is dragged over', () => {
    const { getByTestId } = render(
      <DesktopSwitcher
        desktops={[]}
        onCreateDesktop={() => 'desktop-1'}
      />,
    );

    const dropZone = getByTestId('desktop-switcher-create');
    const dataTransfer = createDataTransfer({ [WINDOW_DRAG_TYPE]: 'window-1' });

    fireEvent.dragEnter(dropZone, { dataTransfer });
    expect(dropZone).toHaveAttribute('data-highlighted', 'true');

    fireEvent.dragLeave(dropZone, { dataTransfer, relatedTarget: null });
    expect(dropZone).toHaveAttribute('data-highlighted', 'false');
  });

  it('creates a desktop, moves the window, and switches focus on drop', async () => {
    const createDesktop = jest.fn().mockResolvedValue({ id: 'desktop-2' });
    const moveWindow = jest.fn().mockResolvedValue(undefined);
    const selectDesktop = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <DesktopSwitcher
        desktops={[{ id: 'desktop-1', name: 'Main', windows: [] }]}
        activeDesktopId="desktop-1"
        onCreateDesktop={createDesktop}
        onMoveWindow={moveWindow}
        onSelectDesktop={selectDesktop}
      />,
    );

    const dropZone = getByTestId('desktop-switcher-create');
    const dataTransfer = createDataTransfer({ [WINDOW_DRAG_TYPE]: 'window-42' });

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer });
      await Promise.resolve();
    });

    expect(createDesktop).toHaveBeenCalledWith({ windowId: 'window-42' });
    expect(moveWindow).toHaveBeenCalledWith('window-42', 'desktop-2');
    expect(selectDesktop).toHaveBeenCalledWith('desktop-2');
    expect(dropZone).toHaveAttribute('data-highlighted', 'false');
  });

  it('supports JSON payloads when extracting the dragged window id', async () => {
    const createDesktop = jest.fn().mockResolvedValue('desktop-3');
    const moveWindow = jest.fn().mockResolvedValue(undefined);
    const selectDesktop = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <DesktopSwitcher
        desktops={[{ id: 'desktop-1', name: 'Main', windows: [] }]}
        onCreateDesktop={createDesktop}
        onMoveWindow={moveWindow}
        onSelectDesktop={selectDesktop}
      />,
    );

    const payload = JSON.stringify({ windowId: 'window-5' });
    const dataTransfer = createDataTransfer({ [WINDOW_DRAG_JSON]: payload });

    await act(async () => {
      fireEvent.drop(getByTestId('desktop-switcher-create'), { dataTransfer });
      await Promise.resolve();
    });

    expect(createDesktop).toHaveBeenCalledWith({ windowId: 'window-5' });
    expect(moveWindow).toHaveBeenCalledWith('window-5', 'desktop-3');
    expect(selectDesktop).toHaveBeenCalledWith('desktop-3');
  });

  it('ignores drops that do not contain window data', async () => {
    const createDesktop = jest.fn().mockResolvedValue(null);
    const moveWindow = jest.fn();
    const selectDesktop = jest.fn();

    const { getByTestId } = render(
      <DesktopSwitcher
        desktops={[{ id: 'desktop-1', name: 'Main', windows: [] }]}
        onCreateDesktop={createDesktop}
        onMoveWindow={moveWindow}
        onSelectDesktop={selectDesktop}
      />,
    );

    const dataTransfer = createDataTransfer({ 'text/plain': 'not-a-window' });

    await act(async () => {
      fireEvent.drop(getByTestId('desktop-switcher-create'), { dataTransfer });
      await Promise.resolve();
    });

    expect(createDesktop).not.toHaveBeenCalled();
    expect(moveWindow).not.toHaveBeenCalled();
    expect(selectDesktop).not.toHaveBeenCalled();
  });
});
