import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JohnApp from '../components/apps/john/index.js';
import johnPlaceholders from '../components/apps/john/placeholders';

describe('John desktop guided scenarios', () => {
  it('loads the Raw-MD5 quick win scenario into inputs and interpretation', async () => {
    const user = userEvent.setup();
    render(<JohnApp />);

    await user.selectOptions(
      screen.getByLabelText(/select guided scenario/i),
      'raw-md5-success'
    );
    await user.click(screen.getByRole('button', { name: /load scenario/i }));

    expect(screen.getByLabelText(/hashes/i)).toHaveValue(
      johnPlaceholders.hashedPasswords[0].hash
    );
    expect(screen.getByLabelText(/john output/i)).toHaveTextContent(
      'Loaded 1 password hash'
    );
    expect(
      screen.getByText('A single MD5 hash is cracked immediately with the SecLists sample list.')
    ).toBeInTheDocument();
  });
});
