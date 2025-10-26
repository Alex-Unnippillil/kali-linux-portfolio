import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Effects, { supportsWebGL } from '../components/apps/screen-recorder/Effects';

describe('Screen recorder effects pipeline', () => {
    const originalMatchMedia = window.matchMedia;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalCaptureStream = (HTMLCanvasElement.prototype as any).captureStream;
    const originalPlay = HTMLMediaElement.prototype.play;
    const originalPause = HTMLMediaElement.prototype.pause;
    const originalRequestVideoFrameCallback = (HTMLVideoElement.prototype as any).requestVideoFrameCallback;
    const originalReadyState = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState');
    const originalVideoWidth = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoWidth');
    const originalVideoHeight = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoHeight');

    const mockTrack = () => ({ stop: jest.fn(), kind: 'video', enabled: true }) as unknown as MediaStreamTrack;

    const createStream = () => {
        const track = mockTrack();
        const stream = {
            getTracks: () => [track],
            getVideoTracks: () => [track],
            getAudioTracks: () => [],
        } as unknown as MediaStream;
        return stream;
    };

    beforeEach(() => {
        jest.useFakeTimers();
        (window as any).matchMedia = jest.fn().mockImplementation(() => ({
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
        }));
        HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((type: string) => {
            if (type === '2d') {
                return {
                    clearRect: jest.fn(),
                    drawImage: jest.fn(),
                    save: jest.fn(),
                    restore: jest.fn(),
                    beginPath: jest.fn(),
                    ellipse: jest.fn(),
                    clip: jest.fn(),
                    filter: '',
                };
            }
            return null;
        });
        (HTMLCanvasElement.prototype as any).captureStream = jest.fn(() => {
            const track = mockTrack();
            return {
                getVideoTracks: () => [track],
                getAudioTracks: () => [],
                getTracks: () => [track],
            } as unknown as MediaStream;
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'play', {
            configurable: true,
            value: jest.fn().mockResolvedValue(undefined),
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
            configurable: true,
            value: jest.fn(),
        });
        (HTMLVideoElement.prototype as any).requestVideoFrameCallback = jest.fn((cb: FrameRequestCallback) => {
            setTimeout(() => cb(0 as any, 0 as any), 0);
            return 1;
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
            configurable: true,
            get: () => 4,
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
            configurable: true,
            get: () => 1280,
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
            configurable: true,
            get: () => 720,
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        window.matchMedia = originalMatchMedia;
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        if (originalCaptureStream) {
            (HTMLCanvasElement.prototype as any).captureStream = originalCaptureStream;
        }
        HTMLMediaElement.prototype.play = originalPlay;
        if (originalRequestVideoFrameCallback) {
            (HTMLVideoElement.prototype as any).requestVideoFrameCallback = originalRequestVideoFrameCallback;
        }
        if (originalReadyState) {
            Object.defineProperty(HTMLMediaElement.prototype, 'readyState', originalReadyState);
        }
        if (originalVideoWidth) {
            Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', originalVideoWidth);
        }
        if (originalVideoHeight) {
            Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', originalVideoHeight);
        }
        Object.defineProperty(HTMLMediaElement.prototype, 'play', {
            configurable: true,
            value: originalPlay,
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
            configurable: true,
            value: originalPause,
        });
        jest.restoreAllMocks();
    });

    it('falls back to CPU processing when WebGL is unavailable', async () => {
        const stream = createStream();
        const onStreamReady = jest.fn();

        render(<Effects stream={stream} onStreamReady={onStreamReady} />);

        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText(/cpu fallback active/i)).toBeInTheDocument();
        });
        expect(onStreamReady).toHaveBeenCalled();
    });

    it('keeps the same processed stream instance when toggling effects', async () => {
        const stream = createStream();
        const onStreamReady = jest.fn();
        render(<Effects stream={stream} onStreamReady={onStreamReady} />);

        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });

        expect(onStreamReady).toHaveBeenCalled();
        const initialStream = onStreamReady.mock.calls[onStreamReady.mock.calls.length - 1][0];

        const toggleButton = screen.getByRole('button', { name: /on/i });
        fireEvent.click(toggleButton);

        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });

        const latestStream = onStreamReady.mock.calls[onStreamReady.mock.calls.length - 1][0];
        expect(latestStream).toBe(initialStream);
    });

    it('disables controls when reduce motion is requested', async () => {
        (window as any).matchMedia = jest.fn().mockImplementation(() => ({
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
        }));
        const stream = createStream();
        const onStreamReady = jest.fn();

        render(<Effects stream={stream} onStreamReady={onStreamReady} />);

        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });

        const toggleButton = screen.getByRole('button', { name: /off/i });
        expect(toggleButton).toBeDisabled();
        const slider = screen.getByRole('slider');
        expect(slider).toBeDisabled();
        expect(screen.getByText(/effects disabled due to reduced motion preference/i)).toBeInTheDocument();
    });

    it('detects lack of WebGL support via utility helper', () => {
        const canvas = document.createElement('canvas');
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);
        expect(supportsWebGL(canvas)).toBe(false);
    });
});
