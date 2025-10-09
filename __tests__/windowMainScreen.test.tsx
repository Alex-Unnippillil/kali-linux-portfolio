import React from 'react';
import { act, render } from '@testing-library/react';
import { WindowMainScreen } from '../components/base/window';

describe('WindowMainScreen', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('renders screen content and transitions background after delay', () => {
        const screenFn = jest.fn(() => <div>payload</div>);
        const openApp = jest.fn();
        const { container } = render(
            <WindowMainScreen screen={screenFn} addFolder={null} openApp={openApp} context={{ source: 'test' }} />
        );

        const root = container.firstChild as HTMLElement;
        expect(root.className).toContain('bg-ub-cool-grey');
        expect(screenFn).toHaveBeenCalledWith(null, openApp, { source: 'test' });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(root.className).toContain('bg-ub-drk-abrgn');
    });
});
