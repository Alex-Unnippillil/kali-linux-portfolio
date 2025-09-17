import React, { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconsLayer from '../components/desktop/IconsLayer';

describe('IconsLayer marquee selection', () => {
  it('highlights icons inside the marquee and shows a selection count', async () => {
    const containerRef = createRef<HTMLDivElement>();
    render(
      <div
        data-testid="desktop"
        ref={containerRef}
        style={{ position: 'relative', width: 400, height: 300 }}
      >
        <IconsLayer
          containerRef={containerRef}
          onOpen={() => {}}
          icons={[
            { id: 'terminal', title: 'Terminal', icon: '/terminal.png' },
            { id: 'notes', title: 'Notes', icon: '/notes.png' },
            { id: 'calculator', title: 'Calculator', icon: '/calculator.png' },
          ]}
        />
      </div>,
    );

    const desktop = screen.getByTestId('desktop') as HTMLElement;
    desktop.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const terminal = document.getElementById('app-terminal') as HTMLElement;
    const notes = document.getElementById('app-notes') as HTMLElement;
    const calculator = document.getElementById('app-calculator') as HTMLElement;

    terminal.getBoundingClientRect = () => ({
      left: 20,
      top: 20,
      right: 84,
      bottom: 84,
      width: 64,
      height: 64,
      x: 20,
      y: 20,
      toJSON: () => ({}),
    });

    notes.getBoundingClientRect = () => ({
      left: 110,
      top: 30,
      right: 174,
      bottom: 94,
      width: 64,
      height: 64,
      x: 110,
      y: 30,
      toJSON: () => ({}),
    });

    calculator.getBoundingClientRect = () => ({
      left: 260,
      top: 160,
      right: 324,
      bottom: 224,
      width: 64,
      height: 64,
      x: 260,
      y: 160,
      toJSON: () => ({}),
    });

    const user = userEvent.setup();

    await act(async () => {
      await user.pointer([
        { target: desktop, coords: { x: 10, y: 10 }, pointerId: 1, keys: '[MouseLeft>]' },
        { target: desktop, coords: { x: 190, y: 120 }, pointerId: 1 },
      ]);
    });

    await waitFor(() => {
      expect(terminal).toHaveAttribute('data-selected', 'true');
      expect(notes).toHaveAttribute('data-selected', 'true');
    });
    expect(calculator).not.toHaveAttribute('data-selected', 'true');
    expect(screen.getByText('2')).toBeInTheDocument();

    await act(async () => {
      await user.pointer([{ target: desktop, pointerId: 1, keys: '[/MouseLeft]' }]);
    });

    await waitFor(() => {
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });

    expect(terminal).toHaveAttribute('data-selected', 'true');
    expect(notes).toHaveAttribute('data-selected', 'true');
  });
});
