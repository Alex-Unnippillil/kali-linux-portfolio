import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenRecorder from '../components/apps/screen-recorder';

const originalMediaStream = globalThis.MediaStream;
const originalMediaRecorder = (globalThis as any).MediaRecorder;
const originalAudioContext = globalThis.AudioContext;
const originalMediaDevices = navigator.mediaDevices;
const originalCreateObjectURL = URL.createObjectURL;

type TrackKind = 'audio' | 'video';

const createTrack = (kind: TrackKind): MediaStreamTrack => {
    return {
        kind,
        stop: jest.fn(),
    } as unknown as MediaStreamTrack;
};

class MockMediaStream {
    private tracks: MediaStreamTrack[];

    constructor(tracks: MediaStreamTrack[] = []) {
        this.tracks = [...tracks];
    }

    addTrack(track: MediaStreamTrack) {
        this.tracks.push(track);
    }

    getTracks() {
        return [...this.tracks];
    }

    getAudioTracks() {
        return this.tracks.filter((track) => track.kind === 'audio');
    }

    getVideoTracks() {
        return this.tracks.filter((track) => track.kind === 'video');
    }
}

class MockAnalyserNode {
    fftSize = 0;
    frequencyBinCount = 32;
    getByteTimeDomainData = jest.fn((array: Uint8Array) => array.fill(128));
}

class MockMediaStreamSource {
    connect = jest.fn();
    disconnect = jest.fn();
}

class MockAudioContext {
    createMediaStreamSource() {
        return new MockMediaStreamSource();
    }

    createAnalyser() {
        return new MockAnalyserNode();
    }

    close = jest.fn().mockResolvedValue(undefined);
}

class MockMediaRecorder {
    static instances: MockMediaRecorder[] = [];

    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    start: jest.Mock;
    stop: jest.Mock;

    constructor(public readonly stream: MediaStream) {
        this.start = jest.fn();
        this.stop = jest.fn(() => {
            const blob = new Blob(['mock'], { type: 'video/webm' });
            this.ondataavailable?.({ data: blob } as BlobEvent);
            this.onstop?.();
        });
        MockMediaRecorder.instances.push(this);
    }

    static reset() {
        MockMediaRecorder.instances = [];
    }
}

let mockGetDisplayMedia: jest.Mock;
let mockGetUserMedia: jest.Mock;

beforeEach(() => {
    jest.useFakeTimers();
    MockMediaRecorder.reset();

    mockGetDisplayMedia = jest.fn();
    mockGetUserMedia = jest.fn();

    Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
            getDisplayMedia: mockGetDisplayMedia,
            getUserMedia: mockGetUserMedia,
        },
    });

    Object.defineProperty(globalThis, 'MediaStream', {
        configurable: true,
        writable: true,
        value: MockMediaStream,
    });

    Object.defineProperty(globalThis, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: MockMediaRecorder,
    });

    Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        writable: true,
        value: MockAudioContext,
    });

    jest
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        });

    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: jest.fn(() => 'blob:mock'),
    });
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: originalMediaDevices,
        });
    } else {
        delete (navigator as any).mediaDevices;
    }

    Object.defineProperty(globalThis, 'MediaStream', {
        configurable: true,
        writable: true,
        value: originalMediaStream,
    });

    Object.defineProperty(globalThis, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: originalMediaRecorder,
    });

    Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        writable: true,
        value: originalAudioContext,
    });

    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
    });
});

test('shows countdown overlay and starts recording after countdown', async () => {
    const displayStream = new MockMediaStream([createTrack('video'), createTrack('audio')]);
    mockGetDisplayMedia.mockResolvedValue(displayStream);

    render(<ScreenRecorder />);

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    });

    await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalled());

    await screen.findByRole('status');

    for (let i = 0; i < 3; i += 1) {
        act(() => {
            jest.advanceTimersByTime(1000);
        });
    }

    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument());
    expect(MockMediaRecorder.instances[0].start).toHaveBeenCalled();
});

test('Escape cancels countdown and stops prepared streams', async () => {
    const videoTrack = createTrack('video');
    const audioTrack = createTrack('audio');
    const displayStream = new MockMediaStream([videoTrack, audioTrack]);
    mockGetDisplayMedia.mockResolvedValue(displayStream);

    render(<ScreenRecorder />);

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    });

    await screen.findByRole('status');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(MockMediaRecorder.instances).toHaveLength(0);
    expect((videoTrack.stop as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((audioTrack.stop as jest.Mock).mock.calls.length).toBeGreaterThan(0);
});

test('shows permission denied message when capture is blocked', async () => {
    mockGetDisplayMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    render(<ScreenRecorder />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission denied/i);
});

test('enabling microphone requests user media and renders audio meter', async () => {
    const displayStream = new MockMediaStream([createTrack('video')]);
    const micTrack = createTrack('audio');
    const microphoneStream = new MockMediaStream([micTrack]);
    mockGetDisplayMedia.mockResolvedValue(displayStream);
    mockGetUserMedia.mockResolvedValue(microphoneStream);

    render(<ScreenRecorder />);

    fireEvent.click(screen.getByLabelText(/microphone/i));
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    });

    await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalled());
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());

    for (let i = 0; i < 3; i += 1) {
        act(() => {
            jest.advanceTimersByTime(1000);
        });
    }

    await waitFor(() => expect(screen.getByTestId('audio-meter')).toBeInTheDocument());
});
