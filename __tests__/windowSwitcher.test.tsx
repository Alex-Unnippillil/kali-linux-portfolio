import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';

jest.mock('html-to-image', () => ({
  toCanvas: jest.fn(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    return canvas;
  }),
}));

const windows = [
  { id: 'app-1', title: 'App One', icon: '/icons/app-one.png' },
  { id: 'app-2', title: 'Second App', icon: '/icons/app-two.png' },
  { id: 'app-3', title: 'Third App', icon: '/icons/app-three.png' },
];

const originalURL = (global as any).URL;
const originalCreateObjectURL = originalURL?.createObjectURL;
const originalRevokeObjectURL = originalURL?.revokeObjectURL;

const setup = (overrides: { onSelect?: jest.Mock; onClose?: jest.Mock } = {}) => {
  const onSelect = overrides.onSelect ?? jest.fn();
  const onClose = overrides.onClose ?? jest.fn();

  const Wrapper: React.FC = () => {
    const [selectedId, setSelectedId] = React.useState<string | null>(windows[0].id);
    const [query, setQuery] = React.useState('');

    const handleHighlight = (id: string | null) => {
      setSelectedId(id);
    };

    return (
      <WindowSwitcher
        windows={windows}
        minimizedWindows={{}}
        focusedId={selectedId ?? undefined}
        query={query}
        selectedId={selectedId ?? undefined}
        onQueryChange={setQuery}
        onHighlight={handleHighlight}
        onSelect={onSelect}
        onClose={onClose}
      />
    );
  };

  const view = render(<Wrapper />);
  return { ...view, onSelect, onClose };
};

describe('WindowSwitcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    if (originalURL) {
      (global as any).URL.createObjectURL = jest.fn(() => 'blob:preview');
      (global as any).URL.revokeObjectURL = jest.fn();
    } else {
      (global as any).URL = {
        createObjectURL: jest.fn(() => 'blob:preview'),
        revokeObjectURL: jest.fn(),
      };
    }
    if (typeof window !== 'undefined') {
      jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback: FrameRequestCallback) => {
          return setTimeout(() => callback(Date.now()), 16) as unknown as number;
        });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle: number) => {
        clearTimeout(handle);
      });
    }
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalURL) {
      (global as any).URL.createObjectURL = originalCreateObjectURL;
      (global as any).URL.revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete (global as any).URL;
    }
  });

  it('focuses the search input on mount', () => {
    setup();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    const input = screen.getByPlaceholderText(/Type to filter open windows/i);
    expect(input).toHaveFocus();
  });

  it('supports arrow-key navigation and selection', () => {
    const { onSelect } = setup();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const firstCard = screen.getByRole('option', { name: /App One/i });
    firstCard.focus();
    expect(firstCard).toHaveFocus();

    fireEvent.keyDown(firstCard, { key: 'ArrowRight' });

    const secondCard = screen.getByRole('option', { name: /Second App/i });
    expect(secondCard).toHaveAttribute('aria-selected', 'true');
    expect(secondCard).toHaveFocus();

    fireEvent.keyDown(secondCard, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('app-2');

    fireEvent.keyUp(window, { key: 'Alt' });
    expect(onSelect).toHaveBeenLastCalledWith('app-2');
  });

  it('filters windows via search and resets selection', () => {
    setup();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const input = screen.getByPlaceholderText(/Type to filter open windows/i);
    fireEvent.change(input, { target: { value: 'second' } });

    const secondCard = screen.getByRole('option', { name: /Second App/i });
    expect(secondCard).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveValue('second');
  });

  it('closes the switcher on escape', () => {
    const { onClose } = setup();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const firstCard = screen.getByRole('option', { name: /App One/i });
    fireEvent.keyDown(firstCard, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

