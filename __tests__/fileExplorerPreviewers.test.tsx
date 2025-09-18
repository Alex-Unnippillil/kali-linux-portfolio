import React from 'react';
import { render, screen } from '@testing-library/react';
import JsonPreviewer from '@/components/apps/file-explorer/previewers/JsonPreviewer';
import FilePreviewPane from '@/components/apps/file-explorer/previewers/FilePreviewPane';

describe('File explorer previewers', () => {
  it('sanitizes JSON content before rendering', () => {
    const malicious = JSON.stringify({
      payload: '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
    });
    render(<JsonPreviewer content={malicious} />);
    const iframe = screen.getByTitle('JSON preview');
    const srcDoc = iframe.getAttribute('srcdoc') || iframe.srcdoc;
    expect(srcDoc).toBeTruthy();
    expect(srcDoc).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(srcDoc).not.toContain('<script>alert(2)</script>');
    expect(srcDoc).not.toContain('<img');
  });

  it('shows the large file fallback when the file exceeds the preview limit', () => {
    const currentFile = {
      name: 'big.json',
      size: 6 * 1024 * 1024,
      previewType: 'json',
      tooLarge: true,
    };

    render(
      <FilePreviewPane currentFile={currentFile as any} content="" imageSrc={null} loading={false} />,
    );

    expect(screen.getByText(/Too large to preview/i)).toBeInTheDocument();
  });
});
