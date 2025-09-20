import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ScreenRecorder from '../../../components/apps/screen-recorder';
import * as redactionUtils from '../../../utils/redaction';

jest.mock('../../../utils/redaction', () => {
  const actual = jest.requireActual('../../../utils/redaction');
  return {
    ...actual,
    detectRedactionsFromBlob: jest.fn(),
    downloadRedactionMetadata: jest.fn(),
  };
});

describe('ScreenRecorder redaction review', () => {
  const detectRedactionsFromBlob = redactionUtils.detectRedactionsFromBlob as jest.MockedFunction<
    typeof redactionUtils.detectRedactionsFromBlob
  >;
  const downloadRedactionMetadata = redactionUtils.downloadRedactionMetadata as jest.MockedFunction<
    typeof redactionUtils.downloadRedactionMetadata
  >;

  let mediaRecorderInstance: any = null;

  class MockMediaRecorder {
    public ondataavailable: ((event: any) => void) | null = null;

    public onstop: (() => void) | null = null;

    constructor(public stream: MediaStream) {
      mediaRecorderInstance = this;
    }

    start() {
      // noop
    }

    stop() {
      this.onstop?.();
    }
  }

  beforeAll(() => {
    (navigator as any).mediaDevices = {
      getDisplayMedia: jest.fn(async () => ({
        getTracks: () => [{ stop: jest.fn() }],
      })),
    };
    Object.defineProperty(window, 'MediaRecorder', {
      writable: true,
      value: MockMediaRecorder,
    });
    global.URL.createObjectURL = jest.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = jest.fn();
    (HTMLAnchorElement.prototype as any).click = jest.fn();
  });

  beforeEach(() => {
    detectRedactionsFromBlob.mockResolvedValue([
      {
        id: 'auto-1',
        type: 'email',
        value: 'user@example.com',
        source: 'auto',
        start: 0,
        end: 0,
        confidence: 0.9,
        bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
      },
    ]);
    downloadRedactionMetadata.mockImplementation(() => undefined);
    mediaRecorderInstance = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows reviewing and updating redaction masks before saving', async () => {
    render(<ScreenRecorder />);

    fireEvent.click(screen.getByText('Start Recording'));
    await waitFor(() => expect((navigator.mediaDevices.getDisplayMedia as jest.Mock).mock.calls.length).toBe(1));
    expect(mediaRecorderInstance).not.toBeNull();
    act(() => {
      mediaRecorderInstance?.ondataavailable?.({ data: new Blob(['token-data'], { type: 'text/plain' }) });
    });

    fireEvent.click(screen.getByText('Stop Recording'));
    await waitFor(() => expect(detectRedactionsFromBlob).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Review Redaction & Save')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Review Redaction & Save'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getAllByTestId('redaction-chip')).toHaveLength(1);

    fireEvent.click(screen.getByText('Add Mask'));
    expect(screen.getAllByTestId('redaction-chip')).toHaveLength(2);

    fireEvent.click(screen.getAllByText('Remove')[0]);
    expect(screen.getAllByTestId('redaction-chip')).toHaveLength(1);

    fireEvent.click(screen.getByText('Save Recording'));
    await waitFor(() => expect(downloadRedactionMetadata).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
