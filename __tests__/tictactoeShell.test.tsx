import { render, fireEvent } from '@testing-library/react';
import TicTacToeApp from '../components/apps/tictactoe';

describe('TicTacToe with GameShell', () => {
  it('hides virtual controls on keyboard input', () => {
    const { queryByTestId } = render(<TicTacToeApp />);
    const ftue = queryByTestId('ftue-overlay');
    if (ftue) fireEvent.click(ftue);
    expect(queryByTestId('virtual-controls')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(queryByTestId('virtual-controls')).toBeNull();
  });

  it('auto pauses on visibility change', () => {
    const { queryByTestId } = render(<TicTacToeApp />);
    const ftue = queryByTestId('ftue-overlay');
    if (ftue) fireEvent.click(ftue);
    expect(queryByTestId('pause-overlay')).toBeNull();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(queryByTestId('pause-overlay')).toBeTruthy();
  });

  it('persists settings between sessions', () => {
    let view = render(<TicTacToeApp />);
    const { getByTestId, getByLabelText, getByText, container, unmount } = view;
    const ftue = view.queryByTestId('ftue-overlay');
    if (ftue) fireEvent.click(ftue);
    fireEvent.click(getByText('X'));
    fireEvent.click(getByTestId('settings-btn'));
    fireEvent.click(getByLabelText('High contrast'));
    fireEvent.click(getByText('Close'));
    expect(container.querySelector('.bg-black')).toBeTruthy();
    unmount();
    view = render(<TicTacToeApp />);
    const ftue2 = view.queryByTestId('ftue-overlay');
    if (ftue2) fireEvent.click(ftue2);
    fireEvent.click(view.getByText('X'));
    expect(view.container.querySelector('.bg-black')).toBeTruthy();
  });
});
