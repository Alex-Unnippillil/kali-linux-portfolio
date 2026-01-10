import { render, screen } from '@testing-library/react';
import DownloadCard from '../components/ui/DownloadCard';

describe('DownloadCard', () => {
  test('renders download link with label', () => {
    render(
      <DownloadCard title="File" description="Desc" href="/file.txt" />
    );
    const link = screen.getByRole('link', { name: /download file/i });
    expect(link).toHaveAttribute('href', '/file.txt');
    expect(link).toHaveAttribute('download');
  });
});
