import React, { useState } from 'react';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';

const createTabs = (): TabDefinition[] => [
  { id: 'one', title: 'Tab One', content: <div>One</div> },
  { id: 'two', title: 'Tab Two', content: <div>Two</div> },
  { id: 'three', title: 'Tab Three', content: <div>Three</div> },
];

describe('TabbedWindow keyboard interactions', () => {
  beforeEach(() => {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
    window.cancelAnimationFrame = jest.fn();
    if (!HTMLElement.prototype.scrollTo) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        value: () => {},
        configurable: true,
      });
    }
    if (!HTMLElement.prototype.scrollBy) {
      Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
        value: () => {},
        configurable: true,
      });
    }
  });

  it('supports roving focus and activation via keyboard', async () => {
    render(<TabbedWindow initialTabs={createTabs()} />);

    const firstTab = screen.getByRole('tab', { name: /tab one/i });
    const secondTab = screen.getByRole('tab', { name: /tab two/i });
    const thirdTab = screen.getByRole('tab', { name: /tab three/i });

    act(() => {
      firstTab.focus();
    });
    expect(firstTab).toHaveFocus();

    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    await waitFor(() => expect(secondTab).toHaveFocus());
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(secondTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(secondTab, { key: 'End' });
    await waitFor(() => expect(thirdTab).toHaveFocus());
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(thirdTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(thirdTab, { key: 'Enter' });
    fireEvent.keyUp(thirdTab, { key: 'Enter' });
    await waitFor(() => expect(thirdTab).toHaveAttribute('aria-selected', 'true'));

    fireEvent.keyDown(thirdTab, { key: 'Home' });
    await waitFor(() => expect(firstTab).toHaveFocus());
    expect(thirdTab).toHaveAttribute('aria-selected', 'true');
  });

  it('reopens the most recently closed tab with Ctrl+Shift+T', async () => {
    render(<TabbedWindow initialTabs={createTabs()} />);

    const secondTab = screen.getByRole('tab', { name: /tab two/i });
    const closeButton = within(secondTab).getByRole('button', { name: /close tab/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('tab', { name: /tab two/i })).not.toBeInTheDocument();

    const container = screen.getByRole('tablist').closest('[tabindex="0"]') as HTMLElement;
    fireEvent.keyDown(container, { key: 't', ctrlKey: true, shiftKey: true });

    const restoredTab = await screen.findByRole('tab', { name: /tab two/i });
    expect(restoredTab).toHaveAttribute('aria-selected', 'true');
    const labels = screen
      .getAllByRole('tab')
      .map((tab) => tab.textContent?.replace('×', '').trim());
    expect(labels).toEqual(['Tab One', 'Tab Two', 'Tab Three']);
  });

  it('restores focus to the trigger element when unmounted', async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen((prev) => !prev)}>
            Toggle Tabs
          </button>
          {open ? <TabbedWindow initialTabs={createTabs()} /> : null}
        </>
      );
    };

    render(<Harness />);

    const toggleButton = screen.getByRole('button', { name: /toggle tabs/i });
    toggleButton.focus();
    fireEvent.click(toggleButton); // open tabs
    const firstTab = await screen.findByRole('tab', { name: /tab one/i });
    act(() => {
      firstTab.focus();
    });
    expect(firstTab).toHaveFocus();

    fireEvent.click(toggleButton); // close tabs
    await waitFor(() => expect(toggleButton).toHaveFocus());
  });
});
