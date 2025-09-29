import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MimikatzOffline from '../components/apps/mimikatz/offline';

describe('MimikatzOffline', () => {
  const dropFile = (file: File) => {
    const dropzone = screen.getByTestId('mimikatz-dropzone');
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });
  };

  it('parses credentials from a supported text file', async () => {
    render(<MimikatzOffline />);

    const file = new File(['username: admin\npassword: secret123'], 'dump.txt', {
      type: 'text/plain',
    });

    dropFile(file);

    expect(await screen.findByText(/User: admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Password: secret123/i)).toBeInTheDocument();
    expect(screen.queryByText(/No credentials/)).not.toBeInTheDocument();
  });

  it('shows an error for unsupported mime types', async () => {
    render(<MimikatzOffline />);

    const file = new File(['fake image'], 'image.png', { type: 'image/png' });
    const input = screen.getByTestId('mimikatz-file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText(/Unsupported file type\. Please upload a text-based dump/i)
      ).toBeInTheDocument()
    );
  });

  it('rejects binary blobs even if they have a text extension', async () => {
    render(<MimikatzOffline />);

    const binaryFile = new File([new Uint8Array([0, 1, 2, 3, 4, 5])], 'binary.txt', {
      type: 'text/plain',
    });

    dropFile(binaryFile);

    await waitFor(() =>
      expect(
        screen.getByText(/appears to be binary/i)
      ).toBeInTheDocument()
    );
  });
});
