import React from 'react';
import { render } from '@testing-library/react';
import { WindowXBorder, WindowYBorder } from '../components/base/window';

describe('Window borders drag previews', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('uses a transparent drag element for the vertical border', () => {
        const resize = jest.fn();
        const { container, unmount } = render(<WindowYBorder resize={resize} />);
        const border = container.firstChild as HTMLElement;
        const setDragImage = jest.fn();
        const dragStartEvent = new Event('dragstart', { bubbles: true });
        Object.assign(dragStartEvent, { dataTransfer: { setDragImage } });

        border.dispatchEvent(dragStartEvent);

        expect(setDragImage).toHaveBeenCalledTimes(1);
        const [element] = setDragImage.mock.calls[0];
        expect(element).toBeInstanceOf(HTMLElement);
        expect((element as HTMLElement).style.opacity).toBe('0');
        expect(element?.parentElement).toBe(document.body);

        unmount();
        expect(document.body.contains(element)).toBe(false);
    });

    it('invokes resize handler on drag for horizontal border', () => {
        const resize = jest.fn();
        const { container } = render(<WindowXBorder resize={resize} />);
        const border = container.firstChild as HTMLElement;
        const dragEvent = new Event('drag', { bubbles: true });
        Object.assign(dragEvent, { dataTransfer: { setDragImage: jest.fn() } });

        border.dispatchEvent(dragEvent);

        expect(resize).toHaveBeenCalled();
    });
});
