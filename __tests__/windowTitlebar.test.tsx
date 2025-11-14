import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { WindowTopBar } from '../components/base/window';
import { isElementTextTruncated } from '../components/base/windowTitleUtils';

jest.mock('../components/base/windowTitleUtils', () => ({
  isElementTextTruncated: jest.fn(() => true),
}));

const mockedIsElementTextTruncated = isElementTextTruncated as jest.MockedFunction<typeof isElementTextTruncated>;

describe('WindowTopBar accessibility', () => {
  const baseProps = {
    onKeyDown: () => {},
    onBlur: () => {},
    grabbed: false,
    onPointerDown: () => {},
    onDoubleClick: () => {},
    controls: <div data-testid="controls" />,
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('marks the window title as truncated when overflow is detected', () => {
    render(<WindowTopBar {...baseProps} title="Overflowing title text" />);
    const titleElement = screen.getByTestId('window-title');
    expect(titleElement).toHaveAttribute('data-truncated', 'true');
  });

  it('does not mark the title as truncated when helper returns false', () => {
    mockedIsElementTextTruncated.mockReturnValueOnce(false);
    render(<WindowTopBar {...baseProps} title="Short" />);
    const titleElement = screen.getByTestId('window-title');
    expect(titleElement).toHaveAttribute('data-truncated', 'false');
  });

  it('shows an accessible tooltip with the full title when truncated', async () => {
    jest.useFakeTimers();
    render(<WindowTopBar {...baseProps} title="Extremely verbose window title for tooltip" />);

    const topBar = screen.getByTestId('window-top-bar');

    act(() => {
      topBar.focus();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Extremely verbose window title for tooltip');
    expect(topBar).toHaveAttribute('aria-describedby', tooltip.id);

    act(() => {
      topBar.blur();
      jest.runOnlyPendingTimers();
    });
  });
});
