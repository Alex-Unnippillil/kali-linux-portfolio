import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportAnnotate from '../components/apps/ghidra/ImportAnnotate';

describe('ImportAnnotate', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('filters imports by library source', () => {
    render(
      <ImportAnnotate
        initialSections={['.text']}
        initialStrings={[]}
        initialImports={['printf', 'CreateFileA']}
      />
    );

    expect(screen.getByText('printf')).toBeInTheDocument();
    expect(screen.getByText('CreateFileA')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter imports by library/i), {
      target: { value: 'win32' },
    });

    expect(screen.getByText('CreateFileA')).toBeInTheDocument();
    expect(screen.queryByText('printf')).not.toBeInTheDocument();
  });

  it('filters strings by type and copies symbol names', async () => {
    render(
      <ImportAnnotate
        initialSections={[]}
        initialStrings={[
          { value: 'AlphaString', type: 'ASCII' },
          { value: 'BetaWide', type: 'Unicode' },
        ]}
        initialImports={['printf']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Filter strings by encoding/i), {
      target: { value: 'Unicode' },
    });

    expect(screen.getByText('BetaWide')).toBeInTheDocument();
    expect(screen.queryByText('AlphaString')).not.toBeInTheDocument();

    const copyButton = screen.getByRole('button', { name: /Copy symbol printf/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('printf');
    });
  });
});

