import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';
import sample from '../apps/radare2/sample.json';

describe('Radare2 navigation', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    window.localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('tracks seek history and allows stepping back', async () => {
    render(<Radare2 initialData={sample} />);

    await screen.findByText('0x1000: push rbp');
    await screen.findByText('Xrefs for 0x1000');

    fireEvent.change(screen.getByPlaceholderText('seek 0x...'), {
      target: { value: '0x1004' },
    });
    fireEvent.click(screen.getByText('Seek'));

    await screen.findByText('Xrefs for 0x1004');

    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).not.toBeDisabled();

    fireEvent.click(backButton);

    await screen.findByText('Xrefs for 0x1000');
  });

  it('seeks through xrefs and trims forward history on new jumps', async () => {
    render(<Radare2 initialData={sample} />);

    await screen.findByText('0x1000: push rbp');

    fireEvent.change(screen.getByPlaceholderText('seek 0x...'), {
      target: { value: '0x1004' },
    });
    fireEvent.click(screen.getByText('Seek'));

    const xrefSection = screen.getByText('Xrefs for 0x1004').parentElement;
    if (!xrefSection) {
      throw new Error('Xref section not found');
    }

    const seekToButton = within(xrefSection).getByRole('button', { name: 'Seek to' });
    fireEvent.click(seekToButton);

    await screen.findByText('Xrefs for 0x1009');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText('Xrefs for 0x1004');

    fireEvent.change(screen.getByPlaceholderText('find'), {
      target: { value: '0x100a' },
    });
    fireEvent.click(screen.getByText('Find'));

    await screen.findByText('Xrefs for 0x100a');

    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled();
  });
});
