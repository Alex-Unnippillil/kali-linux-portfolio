import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShortcutSelector from '../components/screen/shortcut-selector';

jest.mock('../components/base/ubuntu_app', () =>
    function UbuntuApp({ name, openApp }) {
        return (
            <button type="button" onClick={openApp}>
                {name}
            </button>
        );
    }
);

describe('ShortcutSelector dismissal', () => {
    it('calls onClose when the Cancel button is clicked', () => {
        const handleClose = jest.fn();
        render(
            <ShortcutSelector
                apps={[{ id: '1', title: 'App 1', icon: 'icon.png' }]}
                onClose={handleClose}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
        const handleClose = jest.fn();
        render(
            <ShortcutSelector
                apps={[{ id: '1', title: 'App 1', icon: 'icon.png' }]}
                onClose={handleClose}
            />
        );

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the optional backdrop is clicked', () => {
        const handleClose = jest.fn();
        render(
            <ShortcutSelector
                apps={[{ id: '1', title: 'App 1', icon: 'icon.png' }]}
                onClose={handleClose}
                showBackdrop
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /close shortcut selector/i }));

        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
