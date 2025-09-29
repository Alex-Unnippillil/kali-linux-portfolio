import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShortcutSelector, { DEFAULT_SHORTCUTS } from '../components/screen/shortcut-selector';

describe('ShortcutSelector modal', () => {
    const originalClipboard = navigator.clipboard;
    let restoreClipboard;

    beforeEach(() => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            const spy = jest
                .spyOn(navigator.clipboard, 'writeText')
                .mockResolvedValue(undefined);
            restoreClipboard = () => spy.mockRestore();
        } else {
            const stub = { writeText: jest.fn().mockResolvedValue(undefined) };
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: stub,
            });
            restoreClipboard = () => {
                if (!originalClipboard) {
                    delete navigator.clipboard;
                }
            };
        }
    });

    afterEach(() => {
        if (typeof restoreClipboard === 'function') {
            restoreClipboard();
        }
        if (originalClipboard) {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: originalClipboard,
            });
        }
        restoreClipboard = undefined;
    });

    const renderModal = (props = {}) =>
        render(<ShortcutSelector onClose={jest.fn()} shortcuts={DEFAULT_SHORTCUTS} {...props} />);

    test('filters shortcuts when searching by description', async () => {
        const user = userEvent.setup();
        renderModal();

        const search = await screen.findByRole('searchbox', { name: /search shortcuts/i });
        await waitFor(() => expect(search).toHaveFocus());

        await user.type(search, 'clipboard');

        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(items[0]).toHaveTextContent(/open the clipboard manager/i);
        expect(
            screen.queryByText(/switch between open apps$/i, { selector: 'p' })
        ).not.toBeInTheDocument();
    });

    test('copies shortcut text to the clipboard', async () => {
        const user = userEvent.setup();
        renderModal();

        const copyButton = await screen.findByRole('button', {
            name: /copy open the clipboard manager/i,
        });

        await user.click(copyButton);

        expect(
            await screen.findByText(/copied ctrl \+ shift \+ v to clipboard\./i)
        ).toBeInTheDocument();
    });

    test('keeps focus trapped within the modal dialog', async () => {
        const user = userEvent.setup();
        renderModal();

        const search = await screen.findByRole('searchbox', { name: /search shortcuts/i });
        await waitFor(() => expect(search).toHaveFocus());

        const copyButtons = screen.getAllByRole('button', { name: /^copy/i });
        const closeButton = screen.getByRole('button', { name: /^close$/i });
        const lastCopy = copyButtons[copyButtons.length - 1];

        lastCopy.focus();
        expect(lastCopy).toHaveFocus();

        await user.tab();
        expect(closeButton).toHaveFocus();

        await user.tab();
        expect(search).toHaveFocus();
    });
});
