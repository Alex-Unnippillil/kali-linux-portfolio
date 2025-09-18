import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScreenRecorder from '../components/apps/screen-recorder';

type UseOPFSReturn = {
  supported: boolean;
  getDir: jest.Mock;
  writeFile: jest.Mock;
};

const mockUseOPFS = jest.fn<UseOPFSReturn, []>();

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: () => mockUseOPFS(),
}));

jest.mock('../components/ui/Toast', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => <div>{message}</div>,
}));

class MockMediaRecorder {
  public ondataavailable: ((event: { data: Blob }) => void) | null = null;
  public onstop: (() => void) | null = null;

  constructor(public stream: any) {}

  start() {}

  stop() {
    const chunk = new Blob(['chunk'], { type: 'video/webm' });
    this.ondataavailable?.({ data: chunk });
    this.onstop?.();
  }
}

describe('ScreenRecorder save paths', () => {
  const originalMediaRecorder = (window as any).MediaRecorder;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalMediaDevices = navigator.mediaDevices;
  const originalShowSaveFilePicker = (window as any).showSaveFilePicker;
  const stopTrack = jest.fn();
  const stream = {
    getTracks: () => [{ stop: stopTrack }],
  } as any;
  const getDisplayMedia = jest.fn();

  beforeEach(() => {
    stopTrack.mockReset();
    getDisplayMedia.mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getDisplayMedia },
      configurable: true,
      writable: true,
    });
    (window as any).MediaRecorder = MockMediaRecorder;
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();
    mockUseOPFS.mockReset();
  });

  afterEach(() => {
    (window as any).MediaRecorder = originalMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
    if (originalShowSaveFilePicker) {
      (window as any).showSaveFilePicker = originalShowSaveFilePicker;
    } else {
      Reflect.deleteProperty(window, 'showSaveFilePicker');
    }
  });

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('writes recording to Files app and metadata when OPFS is available', async () => {
    const recordingsHandle = {};
    const metadataHandle = {};
    const writeFile = jest.fn().mockResolvedValue(true);
    const getDir = jest.fn().mockImplementation(async (path: string) => {
      if (path === 'recordings') return recordingsHandle;
      if (path === 'recordings/.metadata') return metadataHandle;
      return null;
    });
    mockUseOPFS.mockReturnValue({
      supported: true,
      getDir,
      writeFile,
    });

    render(<ScreenRecorder />);
    await act(async () => {
      fireEvent.click(screen.getByText('Start Recording'));
    });
    await waitFor(() => expect(screen.getByText('Stop Recording')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('Stop Recording'));
    });
    await waitFor(() => expect(screen.getByText('Save Recording')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('Save Recording'));
    });

    await waitFor(() => expect(writeFile).toHaveBeenCalled());
    const saveCall = writeFile.mock.calls.find((call) => call[2] === recordingsHandle);
    expect(saveCall?.[0]).toMatch(/recording-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.webm/);
    expect(saveCall?.[1]).toBeInstanceOf(Blob);

    const metadataCall = writeFile.mock.calls.find((call) => call[2] === metadataHandle);
    expect(metadataCall?.[0]).toMatch(/recording-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.webm\.json/);
    expect(metadataCall?.[1]).toEqual(expect.stringContaining('"tag": "recording"'));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Saved to Files → recordings\/recording-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.webm/,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('falls back to download link when Files app is unavailable', async () => {
    const fallbackGetDir = jest.fn().mockResolvedValue(null);
    const fallbackWriteFile = jest.fn().mockResolvedValue(false);
    mockUseOPFS.mockReturnValue({
      supported: false,
      getDir: fallbackGetDir,
      writeFile: fallbackWriteFile,
    });

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const removeSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'remove')
      .mockImplementation(() => {});
    Reflect.deleteProperty(window, 'showSaveFilePicker');

    try {
      render(<ScreenRecorder />);
      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });
      await waitFor(() => expect(screen.getByText('Stop Recording')).toBeInTheDocument());
      await act(async () => {
        fireEvent.click(screen.getByText('Stop Recording'));
      });
      await waitFor(() => expect(screen.getByText('Save Recording')).toBeInTheDocument());
      await act(async () => {
        fireEvent.click(screen.getByText('Save Recording'));
      });

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      const [anchorInstance] = clickSpy.mock.instances;
      expect(anchorInstance?.download).toBe('recording.webm');
      expect(removeSpy).toHaveBeenCalled();
    } finally {
      clickSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });
});
