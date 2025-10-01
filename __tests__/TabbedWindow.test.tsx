import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  global.ResizeObserver = ResizeObserverMock;

  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType?: string;
      isPrimary?: boolean;

      constructor(type: string, eventInitDict?: PointerEventInit) {
        super(type, eventInitDict);
        this.pointerId = eventInitDict?.pointerId ?? 0;
        this.pointerType = eventInitDict?.pointerType ?? 'mouse';
        this.isPrimary = eventInitDict?.isPrimary ?? true;
      }
    }
    // @ts-ignore
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
    // @ts-ignore
    global.PointerEvent = window.PointerEvent;
  }

  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      value: jest.fn(),
      configurable: true,
    });
  }

  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: jest.fn(),
      configurable: true,
    });
  }
});

beforeEach(() => {
  window.localStorage.clear();
});

const createTabs = (): TabDefinition[] => [
  { id: 'one', title: 'One', content: <div>one</div> },
  { id: 'two', title: 'Two', content: <div>two</div> },
  { id: 'three', title: 'Three', content: <div>three</div> },
];

test('reorders tabs via pointer drag and announces the new position', async () => {
  render(<TabbedWindow initialTabs={createTabs()} storageKey="test-tabs" />);

  const tablist = screen.getByRole('tablist');
  Object.defineProperty(tablist, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 300, height: 40, right: 300, bottom: 40 }),
    configurable: true,
  });
  Object.defineProperty(tablist, 'scrollLeft', { value: 0, writable: true });

  const tabs = within(tablist).getAllByRole('tab');
  tabs.forEach((tab, index) => {
    Object.defineProperty(tab, 'offsetLeft', { value: index * 100, configurable: true });
    Object.defineProperty(tab, 'offsetWidth', { value: 100, configurable: true });
  });

  const firstTab = tabs[0];
  fireEvent.pointerDown(firstTab, { pointerId: 1, clientX: 10, button: 0 });
  act(() => {
    firstTab.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 140, bubbles: true }),
    );
    firstTab.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 260, bubbles: true }),
    );
  });

  await waitFor(() => {
    const activeIndicators = Array.from(
      document.querySelectorAll('[data-testid="tab-drop-indicator"]'),
    ).filter((el) => el.getAttribute('data-active') === 'true');
    expect(activeIndicators).toHaveLength(1);
  });

  act(() => {
    firstTab.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, clientX: 260, bubbles: true }),
    );
  });

  await waitFor(() => {
    const orderedTitles = within(tablist)
      .getAllByRole('tab')
      .map((tab) => tab.querySelector('span')?.textContent);
    expect(orderedTitles).toEqual(['Two', 'Three', 'One']);
  });

  expect(screen.getByRole('status')).toHaveTextContent('One moved to position 3 of 3.');
  await waitFor(() =>
    expect(window.localStorage.getItem('test-tabs:order')).toBe(
      JSON.stringify(['two', 'three', 'one']),
    ),
  );
});

test('restores persisted tab order on mount', async () => {
  window.localStorage.setItem('persisted-tabs:order', JSON.stringify(['beta', 'gamma', 'alpha']));

  const tabs: TabDefinition[] = [
    { id: 'alpha', title: 'Alpha', content: <div>alpha</div> },
    { id: 'beta', title: 'Beta', content: <div>beta</div> },
    { id: 'gamma', title: 'Gamma', content: <div>gamma</div> },
  ];

  render(<TabbedWindow initialTabs={tabs} storageKey="persisted-tabs" />);

  const tablist = screen.getByRole('tablist');

  await waitFor(() => {
    const titles = within(tablist)
      .getAllByRole('tab')
      .map((tab) => tab.querySelector('span')?.textContent);
    expect(titles).toEqual(['Beta', 'Gamma', 'Alpha']);
  });
});
