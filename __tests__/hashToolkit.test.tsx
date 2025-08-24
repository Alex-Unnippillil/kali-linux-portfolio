import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import HashToolkit from '../apps/hash-toolkit';

describe('HashToolkit', () => {
  it('computes hashes for text input', () => {
    const { getByTestId } = render(<HashToolkit />);
    fireEvent.change(getByTestId('text-input'), { target: { value: 'hello' } });
    expect(getByTestId('md5')).toHaveValue('5d41402abc4b2a76b9719d911017c592');
    expect(getByTestId('sha1')).toHaveValue('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(getByTestId('sha256')).toHaveValue('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(getByTestId('ssdeep')).toHaveValue('3:iKn:p');
  });

  it('copies hash to clipboard', () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByTestId } = render(<HashToolkit />);
    fireEvent.change(getByTestId('text-input'), { target: { value: 'hello' } });
    fireEvent.click(getByTestId('copy-sha256'));
    expect(writeText).toHaveBeenCalledWith('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('computes hashes for file input', async () => {
    const { getByTestId } = render(<HashToolkit />);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.change(getByTestId('file-input'), { target: { files: [file] } });
    await waitFor(() =>
      expect(getByTestId('md5')).toHaveValue('5d41402abc4b2a76b9719d911017c592'),
    );
    expect(getByTestId('ssdeep')).toHaveValue('3:iKn:p');
  });
});

