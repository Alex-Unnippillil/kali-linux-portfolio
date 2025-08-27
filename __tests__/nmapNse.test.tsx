import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNseApp from '../components/apps/nmap-nse';

describe('Nmap NSE info', () => {
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

  it('renders static content and handles commands', async () => {
    const user = userEvent.setup();
    // @ts-ignore
    navigator.clipboard.writeText = writeText;
    render(<NmapNseApp />);
    expect(screen.getByText(/Scripting Engine/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /install/i }));
    const copy = screen.getAllByLabelText('copy')[0];
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith('sudo apt install nmap');
    const run = screen.getAllByLabelText('run')[0];
    await user.click(run);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('sudo apt install nmap')
    );
  });
});
