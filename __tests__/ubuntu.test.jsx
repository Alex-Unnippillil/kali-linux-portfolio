import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';
jest.mock('../components/screen/desktop', () => () => <div data-testid="desktop"/>);
jest.mock('../components/screen/navbar', () => () => <div data-testid="navbar"/>);
jest.mock('../components/screen/lock_screen', () => () => <div data-testid="lock-screen"/>);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
describe('Ubuntu component', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    it('renders boot screen then desktop', () => {
        render(<Ubuntu />);
        const bootLogo = screen.getByAltText('Ubuntu Logo');
        const bootScreen = bootLogo.parentElement;
        expect(bootScreen).toHaveClass('visible');
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(bootScreen).toHaveClass('invisible');
        expect(screen.getByTestId('desktop')).toBeInTheDocument();
    });
});
