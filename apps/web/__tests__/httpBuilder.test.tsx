import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTTPBuilder } from '../apps/http';

describe('HTTPBuilder', () => {
  it('includes headers in the generated command preview', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    await user.type(screen.getByLabelText(/url/i), 'https://api.example.com');
    await user.click(screen.getByRole('button', { name: /headers/i }));

    const nameInput = screen.getByLabelText(/header name/i);
    const valueInput = screen.getByLabelText(/header value/i);

    await user.type(nameInput, 'Accept');
    await user.type(valueInput, 'application/json');

    const preview = screen.getByTestId('command-preview');
    expect(preview.textContent).toContain("-H 'Accept: application/json'");
    expect(preview.textContent).toContain("'https://api.example.com'");
  });
});
