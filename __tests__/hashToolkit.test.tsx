import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import HashToolkit from '@apps/hash-toolkit';

describe('HashToolkit', () => {
  it('computes hashes for text input', () => {
    const { getByTestId } = render(<HashToolkit />);
    fireEvent.change(getByTestId('text-input'), { target: { value: 'hello' } });
    expect(getByTestId('md5')).toHaveValue('5d41402abc4b2a76b9719d911017c592');
    expect(getByTestId('sha1')).toHaveValue('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(getByTestId('sha256')).toHaveValue('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(getByTestId('sha512')).toHaveValue(
      '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
    );
    expect(getByTestId('ssdeep')).toHaveValue('3:iKn:p');
    expect(getByTestId('simhash')).toHaveValue('6165086c');
  });

  it('computes TLSH for complex text', () => {
    const { getByTestId } = render(<HashToolkit />);
    const text =
      'The best documentation is the UNIX source. After all, this is what the system uses for documentation when it decides what to do next! The manuals paraphrase the source, often having been written at different times and by different people than who wrote the code. Think of them as guidelines. Sometimes they are more like wishes... Nonetheless, it is all too common to turn to the source and find options and behaviors that are not documented in the manual. Sometimes you find options described in the manual that are unimplemented and ignored by the source.';
    fireEvent.change(getByTestId('text-input'), { target: { value: text } });
    expect(getByTestId('tlsh')).toHaveValue(
      'B1F02BEF718027B0160B4391212822E97F1A463D5A3B1549B86CF62973B197A92731F8',
    );
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

