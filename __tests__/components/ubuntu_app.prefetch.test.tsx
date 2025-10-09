import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import UbuntuApp from '../../components/base/ubuntu_app';

describe('UbuntuApp prefetch indicator', () => {
    const baseProps = {
        id: 'demo-app',
        name: 'Demo App',
        icon: './icon.png',
        openApp: jest.fn(),
    };

    it('renders default indicator only while prefetch is pending', async () => {
        let resolvePrefetch: () => void = () => {};
        const prefetchPromise = new Promise<void>((resolve) => {
            resolvePrefetch = resolve;
        });

        render(<UbuntuApp {...baseProps} prefetch={() => prefetchPromise} />);

        const tile = screen.getByRole('button', { name: baseProps.name });

        expect(screen.queryByTestId('prefetch-indicator')).toBeNull();

        fireEvent.mouseEnter(tile);

        const indicator = await screen.findByTestId('prefetch-indicator');
        expect(indicator).toBeInTheDocument();

        await act(async () => {
            resolvePrefetch();
            await prefetchPromise;
        });

        expect(screen.queryByTestId('prefetch-indicator')).toBeNull();
    });

    it('allows opting out of the indicator when prefetchIndicator is null', async () => {
        let resolvePrefetch: () => void = () => {};
        const prefetchPromise = new Promise<void>((resolve) => {
            resolvePrefetch = resolve;
        });

        render(<UbuntuApp {...baseProps} prefetch={() => prefetchPromise} prefetchIndicator={null} />);

        fireEvent.focus(screen.getByRole('button', { name: baseProps.name }));

        await act(async () => {
            resolvePrefetch();
            await prefetchPromise;
        });

        expect(screen.queryByTestId('prefetch-indicator')).toBeNull();
    });

    it('renders a custom indicator when provided', async () => {
        let resolvePrefetch: () => void = () => {};
        const prefetchPromise = new Promise<void>((resolve) => {
            resolvePrefetch = resolve;
        });

        render(
            <UbuntuApp
                {...baseProps}
                prefetch={() => prefetchPromise}
                prefetchIndicator={<span data-testid="custom-prefetch">loading assets</span>}
            />
        );

        fireEvent.mouseEnter(screen.getByRole('button', { name: baseProps.name }));

        const customIndicator = await screen.findByTestId('custom-prefetch');
        expect(customIndicator).toBeInTheDocument();

        await act(async () => {
            resolvePrefetch();
            await prefetchPromise;
        });

        expect(screen.queryByTestId('custom-prefetch')).toBeNull();
    });
});
