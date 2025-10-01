import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';
import sample from '../apps/radare2/sample.json';

describe('Radare2 annotations workflow', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    window.localStorage.clear();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('supports inline rename, comments, undo/redo, and export', async () => {
    render(<Radare2 initialData={{ ...sample, file: 'test.bin' }} />);

    const renameButtons = screen.getAllByText('Rename');
    fireEvent.click(renameButtons[0]);
    const renameInput = screen.getByLabelText('Rename 0x1000');
    fireEvent.change(renameInput, { target: { value: 'entry' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });
    expect(await screen.findByText('entry')).toBeInTheDocument();

    const commentButtons = screen.getAllByText('Comment');
    fireEvent.click(commentButtons[0]);
    const commentField = screen.getByLabelText('Comment on 0x1000');
    fireEvent.change(commentField, { target: { value: 'prologue' } });
    fireEvent.blur(commentField);
    expect(await screen.findByText(/; prologue/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Undo'));
    expect(screen.queryByText(/; prologue/)).toBeNull();
    fireEvent.click(screen.getByText('Redo'));
    expect(await screen.findByText(/; prologue/)).toBeInTheDocument();

    const stored = JSON.parse(
      window.localStorage.getItem('r2-annotations-test.bin') || '{}',
    );
    expect(stored).toMatchObject({
      '0x1000': { label: 'entry', comment: 'prologue' },
    });

    let capturedBlob: Blob | null = null;
    URL.createObjectURL = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    URL.revokeObjectURL = jest.fn();
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.click(screen.getByText('Export Annotations'));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(capturedBlob).not.toBeNull();
    if (capturedBlob) {
      const text = typeof (capturedBlob as any).text === 'function'
        ? await (capturedBlob as any).text()
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.readAsText(capturedBlob);
          });
      const payload = JSON.parse(text);
      expect(payload.annotations[0]).toMatchObject({
        addr: '0x1000',
        label: 'entry',
        comment: 'prologue',
      });
    }
  });
});
