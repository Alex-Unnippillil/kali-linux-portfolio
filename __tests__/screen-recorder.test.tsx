import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScreenRecorder from '../components/apps/screen-recorder';

type MockBlobEvent = { data: Blob };

class MockMediaRecorder {
    public ondataavailable: ((event: MockBlobEvent) => void) | null = null;

    public onstop: (() => void) | null = null;

    constructor(public readonly stream: MediaStream) {}

    public start = () => {
        // no-op for tests
    };

    public stop = () => {
        this.ondataavailable?.({ data: new Blob(['mock'], { type: 'video/webm' }) });
        this.onstop?.();
    };
}

const mockGetDisplayMedia = jest.fn();

const createMockStream = () => {
    const track = { stop: jest.fn() };
    return {
        getTracks: () => [track],
    } as unknown as MediaStream;
};

const finishCountdown = async () => {
    for (let i = 0; i < 3; i += 1) {
        await act(async () => {
            jest.advanceTimersByTime(1000);
        });
    }
};

describe('ScreenRecorder', () => {
    const originalMediaDevices = navigator.mediaDevices;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalMediaRecorder = (global as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;

    beforeAll(() => {
        Object.defineProperty(window.navigator, 'mediaDevices', {
            configurable: true,
            value: { getDisplayMedia: mockGetDisplayMedia },
        });

        Object.defineProperty(global, 'MediaRecorder', {
            configurable: true,
            writable: true,
            value: MockMediaRecorder,
        });

        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: jest.fn(() => 'blob:mock-url'),
        });

        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: jest.fn(),
        });
    });

    beforeEach(() => {
        jest.useFakeTimers();
        mockGetDisplayMedia.mockReset();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    afterAll(() => {
        Object.defineProperty(window.navigator, 'mediaDevices', {
            configurable: true,
            value: originalMediaDevices,
        });

        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: originalCreateObjectURL,
        });

        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: originalRevokeObjectURL,
        });

        if (originalMediaRecorder) {
            Object.defineProperty(global, 'MediaRecorder', {
                configurable: true,
                writable: true,
                value: originalMediaRecorder,
            });
        } else {
            // Remove the mock if MediaRecorder did not originally exist.
            Reflect.deleteProperty(global as { MediaRecorder?: typeof MediaRecorder }, 'MediaRecorder');
        }
    });

    it('starts recording after the countdown with default options', async () => {
        mockGetDisplayMedia.mockResolvedValueOnce(createMockStream());

        render(<ScreenRecorder />);

        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

        expect(screen.getByTestId('countdown-overlay')).toBeInTheDocument();
        expect(screen.getByTestId('countdown-value')).toHaveTextContent('3');

        await finishCountdown();

        await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalledTimes(1));
        expect(mockGetDisplayMedia).toHaveBeenCalledWith(
            expect.objectContaining({
                audio: true,
                video: expect.objectContaining({
                    cursor: 'always',
                    displaySurface: 'monitor',
                }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

        await waitFor(() => expect(screen.getByRole('button', { name: /save recording/i })).toBeInTheDocument());
    });

    it('allows selecting a browser tab without audio', async () => {
        mockGetDisplayMedia.mockResolvedValueOnce(createMockStream());

        render(<ScreenRecorder />);

        fireEvent.click(screen.getByText('Browser Tab'));
        fireEvent.click(screen.getByLabelText('Capture audio'));

        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

        await finishCountdown();

        await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalledTimes(1));
        expect(mockGetDisplayMedia).toHaveBeenCalledWith(
            expect.objectContaining({
                audio: false,
                video: expect.objectContaining({
                    displaySurface: 'browser',
                }),
            }),
        );
    });

    it('shows a friendly message and offers retry on permission errors', async () => {
        mockGetDisplayMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));

        render(<ScreenRecorder />);

        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

        await finishCountdown();

        await waitFor(() =>
            expect(screen.getByRole('alert')).toHaveTextContent(
                'Screen capture was blocked. Please allow access in your browser settings and try again.',
            ),
        );

        mockGetDisplayMedia.mockResolvedValueOnce(createMockStream());

        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        expect(screen.getByTestId('countdown-overlay')).toBeInTheDocument();

        await finishCountdown();

        await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalledTimes(2));
    });
});

