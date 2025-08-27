import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GhidraApp from '../components/apps/ghidra';

describe('Ghidra info', () => {
  let writeText;
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn();
    writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText: jest.fn() };
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('displays content and resource link', async () => {
    const user = userEvent.setup();
    // @ts-ignore
    navigator.clipboard.writeText = writeText;
    render(<GhidraApp />);
    expect(screen.getByText(/reverse engineering suite/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /install/i }));
    const copy = screen.getAllByLabelText('copy')[0];
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith('sudo apt install ghidra');
    const run = screen.getAllByLabelText('run')[0];
    await user.click(run);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('sudo apt install ghidra')
    );
    expect(
      screen.getByRole('link', { name: /sample binary/i })
    ).toHaveAttribute('download');
  });
});
