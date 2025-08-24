import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import BinaryHeader from '@apps/binary-header';

describe('BinaryHeader', () => {
  it('shows error for unsupported format', async () => {
    const { getByTestId, findByTestId } = render(<BinaryHeader />);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const error = await findByTestId('error');
    expect(error.textContent).toMatch(/Unsupported/);
  });
});
