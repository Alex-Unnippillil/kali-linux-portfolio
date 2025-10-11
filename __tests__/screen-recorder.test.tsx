import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ScreenRecorder from '../components/apps/screen-recorder';

class MockMediaRecorder {
    public ondataavailable: ((event: BlobEvent) => void) | null = null;

    public onstop: (() => void) | null = null;

    public onerror: ((event: Event) => void) | null = null;

    public readonly mimeType = 'video/webm';

    public static lastInstance: MockMediaRecorder | null = null;

    constructor(public readonly stream: MediaStream) {
        MockMediaRecorder.lastInstance = this;
    }

    start = jest.fn();

    stop = jest.fn(() => {
        const blob = new Blob(['mock-data'], { type: 'video/webm' });
        this.ondataavailable?.({ data: blob } as BlobEvent);
        this.onstop?.();
    });
}

const mockStream = {
    getTracks: () => [
        {
            stop: jest.fn(),
        },
    ],
} as unknown as MediaStream;

function setupMediaDevicesSuccess() {
    Object.defineProperty(navigator, 'mediaDevices', {
        value: {
            getDisplayMedia: jest.fn().mockResolvedValue(mockStream),
        },
        configurable: true,
    });
}

describe('ScreenRecorder', () => {
    const originalMediaRecorder = window.MediaRecorder;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeAll(() => {
        URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        URL.revokeObjectURL = jest.fn();
    });

    beforeEach(() => {
        jest.restoreAllMocks();
        (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
        setupMediaDevicesSuccess();
    });

    afterEach(() => {
        (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder = originalMediaRecorder;
    });

    afterAll(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('renders unsupported message when MediaRecorder is unavailable', () => {
        delete (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
        render(<ScreenRecorder />);

        expect(
            screen.getByText('Screen recording is not supported in this browser.', {
                exact: false,
            }),
        ).toBeInTheDocument();
    });

    it('shows permission denied message when user rejects capture', async () => {
        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getDisplayMedia: jest.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
            },
            configurable: true,
        });

        render(<ScreenRecorder />);

        const startButton = await screen.findByRole('button', { name: /start recording/i });
        fireEvent.click(startButton);

        await waitFor(() => {
            expect(screen.getByText(/permission was denied/i)).toBeInTheDocument();
        });
    });

    it('records and offers download when recording stops', async () => {
        render(<ScreenRecorder />);

        const startButton = await screen.findByRole('button', { name: /start recording/i });
        fireEvent.click(startButton);

        await waitFor(() => expect(MockMediaRecorder.lastInstance?.start).toHaveBeenCalled());

        const stopButton = screen.getByRole('button', { name: /stop recording/i });
        fireEvent.click(stopButton);

        await waitFor(() => {
            expect(screen.getByText(/Recording ready/i)).toBeInTheDocument();
        });

        expect(screen.getByRole('heading', { name: /preview/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /download recording/i })).toBeInTheDocument();
    });

    it('stores recordings in IndexedDB and lists them', async () => {
        render(<ScreenRecorder />);

        const storageSelect = await screen.findByLabelText(/storage target/i);
        fireEvent.change(storageSelect, { target: { value: 'indexeddb' } });

        const nameInput = screen.getByLabelText(/recording name/i);
        fireEvent.change(nameInput, { target: { value: 'demo-recording.webm' } });

        const startButton = screen.getByRole('button', { name: /start recording/i });
        fireEvent.click(startButton);

        await waitFor(() => expect(MockMediaRecorder.lastInstance?.start).toHaveBeenCalled());

        const stopButton = screen.getByRole('button', { name: /stop recording/i });
        fireEvent.click(stopButton);

        await waitFor(() => {
            expect(screen.getAllByText('demo-recording.webm').length).toBeGreaterThan(0);
        });

        expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
    });
});
