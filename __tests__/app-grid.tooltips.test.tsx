import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

jest.mock('react-virtualized-auto-sizer', () => ({ children }: any) =>
  children({ width: 1024, height: 768 })
);

jest.mock('react-window', () => {
  const React = require('react');
  return {
    Grid: ({ columnCount, rowCount, children, gridRef }: any) => {
      if (gridRef) {
        gridRef.current = {
          scrollToCell: jest.fn(),
        };
      }
      const cells = [];
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          const cell = children({ columnIndex, rowIndex, style: {} });
          if (cell !== null) {
            cells.push(
              <React.Fragment key={`${rowIndex}-${columnIndex}`}>
                {cell}
              </React.Fragment>
            );
          }
        }
      }
      return <div data-testid="mock-grid">{cells}</div>;
    },
  };
});

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'terminal', title: 'Terminal', icon: './icons/terminal.png' },
    { id: 'firefox', title: 'Firefox', icon: './icons/firefox.png' },
  ],
}));

jest.mock('../components/ui/AppTooltipContent', () => ({ meta }: any) => (
  <div data-testid="tooltip-content">
    <h2>{meta.title}</h2>
    <p>{meta.description}</p>
    <ul>
      {meta.keyboard.map((hint: string) => (
        <li key={hint}>{hint}</li>
      ))}
    </ul>
  </div>
));

import AppGrid from '../components/apps/app-grid';

describe('AppGrid tooltips', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows metadata tooltip when hovering an app tile', async () => {
    render(<AppGrid openApp={jest.fn()} />);

    const terminalTile = screen.getByRole('button', { name: 'Terminal' });

    fireEvent.mouseEnter(terminalTile);

    act(() => {
      jest.advanceTimersByTime(350);
    });

    const tooltip = await screen.findByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent('Terminal');
    expect(tooltip).toHaveTextContent(
      'Simulated shell with offline commands and command history.'
    );

    fireEvent.mouseLeave(terminalTile);

    await waitFor(() => {
      expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });
  });

  it('shows and hides tooltip for keyboard focus and blur', async () => {
    render(<AppGrid openApp={jest.fn()} />);

    const firefoxTile = screen.getByRole('button', { name: 'Firefox' });

    fireEvent.focus(firefoxTile);

    act(() => {
      jest.advanceTimersByTime(350);
    });

    const tooltip = await screen.findByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent('Firefox');
    expect(tooltip).toHaveTextContent(
      'Lightweight Firefox-inspired web view that loads a single sandboxed iframe.'
    );
    expect(tooltip).toHaveTextContent('Ctrl+L — Focus address bar');

    fireEvent.blur(firefoxTile);

    await waitFor(() => {
      expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });
  });
});
