import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import HashToolkit from '../apps/hash-toolkit';

describe('HashToolkit', () => {
  it('computes hashes for text input', () => {
    const { getByTestId } = render(<HashToolkit />);
    fireEvent.change(getByTestId('text-input'), { target: { value: 'hello' } });
    expect(getByTestId('md5')).toHaveValue('5d41402abc4b2a76b9719d911017c592');
    expect(getByTestId('sha1')).toHaveValue('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(getByTestId('sha256')).toHaveValue('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(getByTestId('sha512')).toHaveValue('9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043');
    expect(getByTestId('sha3')).toHaveValue('52fa80662e64c128f8389c9ea6c73d4c02368004bf4463491900d11aaadca39d47de1b01361f207c512cfa79f0f92c3395c67ff7928e3f5ce3e3c852b392f976');
    expect(getByTestId('sri256')).toHaveValue('sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=');
    expect(getByTestId('sri512')).toHaveValue('sha512-m3HSJL1i83hdltRq0+o9czGb+8KJDKra4t/3JRlnPKcjI8PZm6XBHXx6zG4UuMXaDEZjR1wuXDre9G9zvN7AQw==');
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

  it('shows error for unsupported files', () => {
    const { getByTestId, getByRole } = render(<HashToolkit />);
    const file = new File(['abc'], 'image.png', { type: 'image/png' });
    fireEvent.change(getByTestId('file-input'), { target: { files: [file] } });
    expect(getByRole('alert')).toHaveTextContent('Unsupported file type');
  });
});

