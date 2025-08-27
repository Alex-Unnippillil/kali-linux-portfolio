import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetasploitApp from '../components/apps/metasploit';

describe('Metasploit info', () => {
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

  it('renders and handles command actions', async () => {
    const user = userEvent.setup();
    // @ts-ignore
    navigator.clipboard.writeText = writeText;
    render(<MetasploitApp />);
    expect(screen.getByText(/framework for developing/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /install/i }));
    const copy = screen.getAllByLabelText('copy')[0];
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith('sudo apt install metasploit-framework');
    const run = screen.getAllByLabelText('run')[0];
    await user.click(run);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('sudo apt install metasploit-framework')
    );
  });
});
