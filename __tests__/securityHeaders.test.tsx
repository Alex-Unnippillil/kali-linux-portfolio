import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import SecurityHeaders from '../apps/security-headers';

describe('SecurityHeaders', () => {
  it('updates snippets based on input', () => {
    const { getByLabelText, getByTestId } = render(<SecurityHeaders />);
    fireEvent.change(getByLabelText(/HSTS max-age/i), { target: { value: '1234' } });
    fireEvent.change(getByLabelText(/Content-Security-Policy/i), { target: { value: "default-src 'none';" } });
    const nginx = getByTestId('nginx-snippet').textContent || '';
    expect(nginx).toContain('max-age=1234');
    expect(nginx).toContain("default-src 'none';");
  });

  it('copies nginx snippet to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByTestId } = render(<SecurityHeaders />);
    fireEvent.click(getByTestId('copy-nginx'));
    const nginx = getByTestId('nginx-snippet').textContent || '';
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(nginx);
    });
  });
});
