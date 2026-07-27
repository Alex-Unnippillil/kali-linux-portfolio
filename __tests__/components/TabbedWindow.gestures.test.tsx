import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

describe('TabbedWindow touch gestures', () => {
  const createPointerEvent = (
    type: string,
    {
      pointerId,
      pointerType,
      clientX,
      clientY,
    }: {
      pointerId: number;
      pointerType: string;
      clientX: number;
      clientY: number;
    },
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    });
    Object.defineProperty(event, 'pointerId', {
      configurable: true,
      value: pointerId,
    });
    Object.defineProperty(event, 'pointerType', {
      configurable: true,
      value: pointerType,
    });
    return event as unknown as PointerEvent;
  };

  const createTabs = (): TabDefinition[] => [
    {
      id: 'first',
      title: 'First tab',
      content: (
        <div>
          <p>First tab content</p>
          <div style={{ height: 600 }}>Scrollable area</div>
        </div>
      ),
    },
    {
      id: 'second',
      title: 'Second tab',
      content: (
        <div>
          <p>Second tab content</p>
          <div style={{ height: 600 }}>Scrollable area</div>
        </div>
      ),
    },
  ];

  it('switches to the next tab after a leftward swipe', async () => {
    render(<TabbedWindow initialTabs={createTabs()} />);

    const content = screen.getByTestId('tabbed-window-content');

    fireEvent(content, createPointerEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 200,
      clientY: 150,
    }));
    fireEvent(content, createPointerEvent('pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 140,
      clientY: 160,
    }));
    fireEvent(content, createPointerEvent('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 110,
      clientY: 165,
    }));

    await waitFor(() => {
      const tabs = screen.getAllByRole('tab');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByText('Second tab content')).toBeVisible();
  });

  it('ignores swipe detection during vertical scrolling gestures', async () => {
    render(<TabbedWindow initialTabs={createTabs()} />);

    const content = screen.getByTestId('tabbed-window-content');

    fireEvent(content, createPointerEvent('pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 120,
      clientY: 40,
    }));
    fireEvent(content, createPointerEvent('pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 130,
      clientY: 140,
    }));
    fireEvent(content, createPointerEvent('pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 135,
      clientY: 220,
    }));

    await waitFor(() => {
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByText('First tab content')).toBeVisible();
  });
});
