import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkRename, {
  BulkRenameItem,
  BulkRenameResult,
} from '../components/apps/file-explorer/BulkRename';

describe('BulkRename', () => {
  const createItems = (names: string[]): BulkRenameItem[] =>
    names.map((name) => ({ name, handle: {} as FileSystemFileHandle }));

  it('renders numbering preview with placeholders', async () => {
    const user = userEvent.setup();
    const items = createItems(['image-raw.png', 'holiday.png']);
    const onSubmit = jest.fn().mockResolvedValue<BulkRenameResult[]>([]);

    render(<BulkRename items={items} onClose={() => {}} onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText(/enable numbering/i));
    const startInput = screen.getByLabelText(/start/i);
    await user.clear(startInput);
    await user.type(startInput, '1');
    const paddingInput = screen.getByLabelText(/padding/i);
    await user.clear(paddingInput);
    await user.type(paddingInput, '3');

    const replaceInput = screen.getByLabelText(/replace/i);
    await user.clear(replaceInput);
    await user.click(replaceInput);
    await user.paste('photo-{{n}}{{ext}}');

    expect(screen.getByText('photo-001.png')).toBeInTheDocument();
    expect(screen.getByText('photo-002.png')).toBeInTheDocument();
  });

  it('applies capture groups when regex is enabled', async () => {
    const user = userEvent.setup();
    const items = createItems(['session-2024.txt', 'archive-2023.txt']);
    const onSubmit = jest.fn().mockResolvedValue<BulkRenameResult[]>([]);

    render(<BulkRename items={items} onClose={() => {}} onSubmit={onSubmit} />);

    const findInput = screen.getByLabelText(/find/i);
    await user.clear(findInput);
    await user.type(findInput, '^(.*)\\.txt$');

    const replaceInput = screen.getByLabelText(/replace/i);
    await user.clear(replaceInput);
    await user.type(replaceInput, '$1.log');

    expect(screen.getByText('session-2024.log')).toBeInTheDocument();
    expect(screen.getByText('archive-2023.log')).toBeInTheDocument();
  });

  it('surfaces per-item errors returned from the rename handler', async () => {
    const user = userEvent.setup();
    const items = createItems(['alpha.txt', 'beta.txt']);
    const onSubmit = jest.fn().mockResolvedValue<BulkRenameResult[]>([
      {
        originalName: 'alpha.txt',
        newName: 'omega.txt',
        success: false,
        error: 'Target exists',
      },
      {
        originalName: 'beta.txt',
        newName: 'beta.txt',
        success: true,
      },
    ]);

    render(<BulkRename items={items} onClose={() => {}} onSubmit={onSubmit} />);

    const findInput = screen.getByLabelText(/find/i);
    await user.clear(findInput);
    await user.type(findInput, 'alpha');

    const replaceInput = screen.getByLabelText(/replace/i);
    await user.clear(replaceInput);
    await user.type(replaceInput, 'omega');

    await user.click(screen.getByRole('button', { name: /apply renames/i }));

    expect(await screen.findByText('Target exists')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          item: expect.objectContaining({ name: 'alpha.txt' }),
          nextName: 'omega.txt',
        }),
      ],
      expect.objectContaining({ dryRun: false }),
    );
  });
});
