import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Controls from '../games/common/controls';

describe('game controls keymap persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/testgame');
  });

  it('saves and loads keymap from localStorage', () => {
    const { getByText, unmount } = render(<Controls />);
    const upButton = getByText(/up: ArrowUp/i);
    fireEvent.click(upButton);
    fireEvent.keyDown(window, { key: 'w' });
    expect(
      JSON.parse(
        window.localStorage.getItem('game-keymap:/testgame') || '{}',
      ).up,
    ).toBe('w');
    unmount();
    const { getByText: getByTextAgain } = render(<Controls />);
    getByTextAgain(/up: w/i);
  });

  it('resets mapping to defaults', () => {
    const { getByText } = render(<Controls />);
    const upButton = getByText(/up: ArrowUp/i);
    fireEvent.click(upButton);
    fireEvent.keyDown(window, { key: 'w' });
    const resetButton = getByText(/Reset Mapping/i);
    fireEvent.click(resetButton);
    getByText(/up: ArrowUp/i);
    expect(
      JSON.parse(
        window.localStorage.getItem('game-keymap:/testgame') || '{}',
      ).up,
    ).toBe('ArrowUp');
  });

  it('imports mapping from file', async () => {
    const { getByText, getByTestId } = render(<Controls />);
    const file = new File([JSON.stringify({ up: 'w' })], 'map.json', {
      type: 'application/json',
    });
    const input = getByTestId('import-file');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => getByText(/up: w/i));
  });
});
