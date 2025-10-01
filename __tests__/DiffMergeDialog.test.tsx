import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiffMergeDialog from '../components/common/DiffMergeDialog';

describe('DiffMergeDialog', () => {
  test('allows selecting hunks and applying resolution', async () => {
    const base = ['alpha', 'beta', 'gamma'].join('\n');
    const incoming = ['alpha', 'beta updated', 'gamma', 'delta'].join('\n');
    const onApply = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <DiffMergeDialog
        isOpen
        baseContent={base}
        incomingContent={incoming}
        entityLabel="test"
        onApply={onApply}
        onClose={onClose}
      />,
    );

    const preview = await screen.findByLabelText('Merged preview');
    expect((preview as HTMLTextAreaElement).value).toBe(incoming);

    const keepCurrent = screen.getAllByLabelText('Keep current value')[0];
    await user.click(keepCurrent);

    await waitFor(() =>
      expect((preview as HTMLTextAreaElement).value).toBe(base),
    );

    await user.type(preview, '\nmanual note');

    await user.click(
      screen.getByRole('button', { name: /Apply resolution/i }),
    );

    expect(onApply).toHaveBeenCalledTimes(1);
    const [merged, meta] = onApply.mock.calls[0];
    expect(merged).toContain('manual note');
    expect(meta.manualEdits).toBe(true);
    expect(Object.values(meta.selection)).toContain('base');
  });
});

