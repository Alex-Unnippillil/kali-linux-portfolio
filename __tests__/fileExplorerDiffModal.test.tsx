import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DiffModal from '../components/apps/file-explorer/DiffModal';

describe('DiffModal', () => {
  const base = `line 1\nline 2\n`;
  const target = `line 1\nline 2\nline 3\n`;

  test('renders diff segments with styling', () => {
    render(
      <DiffModal
        open
        baseContent={base}
        targetContent={target}
        onClose={() => {}}
        onRestore={() => {}}
      />,
    );

    const addedSegments = screen.getAllByTestId('diff-added');
    expect(addedSegments.some((node) => node.textContent?.includes('line 3'))).toBe(true);
  });

  test('invokes restore callback with base content', () => {
    const handleRestore = jest.fn();
    render(
      <DiffModal
        open
        baseContent={base}
        targetContent={target}
        onClose={() => {}}
        onRestore={handleRestore}
      />,
    );

    fireEvent.click(screen.getByText('Restore this version'));
    expect(handleRestore).toHaveBeenCalledWith(base);
  });
});
