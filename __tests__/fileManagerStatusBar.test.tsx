import { render, screen, waitFor } from '@testing-library/react';
import StatusBar, { FileItem } from '../components/file-manager/StatusBar';

const file: FileItem = { name: 'file.txt', kind: 'file', size: 1024 };
const folder: FileItem = {
  name: 'folder',
  kind: 'directory',
  children: [
    { name: 'a', kind: 'file', size: 2048 },
    { name: 'b', kind: 'file', size: 4096 },
  ],
};

describe('StatusBar', () => {
  test('updates count and size when selection changes', async () => {
    const { rerender } = render(<StatusBar selectedItems={[]} />);
    expect(screen.getByText('No items selected')).toBeInTheDocument();
    expect(screen.getByText('0 B')).toBeInTheDocument();

    rerender(<StatusBar selectedItems={[file]} />);
    await waitFor(() => {
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
      expect(screen.getByText('1 KB')).toBeInTheDocument();
    });

    rerender(<StatusBar selectedItems={[folder]} />);
    await waitFor(() => {
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
      expect(screen.getByText('6 KB')).toBeInTheDocument();
    });

    rerender(<StatusBar selectedItems={[file, folder]} />);
    await waitFor(() => {
      expect(screen.getByText('2 items selected')).toBeInTheDocument();
      expect(screen.getByText('7 KB')).toBeInTheDocument();
    });
  });
});

