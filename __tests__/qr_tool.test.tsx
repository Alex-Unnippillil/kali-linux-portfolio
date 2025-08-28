import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import QRTool from '../components/apps/qr_tool';

describe('QRTool drag and drop', () => {
  beforeEach(() => {
    // Mock Worker
    const mockPost = jest.fn();
    // @ts-ignore
    global.Worker = jest.fn(() => ({ postMessage: mockPost, terminate: jest.fn(), onmessage: null }));
    // @ts-ignore
    global.URL.createObjectURL = jest.fn(() => 'blob:');
    // Mock Image to trigger onload immediately
    // @ts-ignore
    global.Image = class {
      onload: (() => void) | null = null;
      width = 2;
      height = 2;
      set src(_v: string) {
        if (this.onload) this.onload();
      }
    } as any;
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 2, height: 2 }),
    }));
  });

  it('sends image data to worker when an image is dropped', async () => {
    const { getByText, getByTestId } = render(<QRTool />);
    fireEvent.click(getByText('Scan'));
    const zone = getByTestId('drop-zone');
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    // Worker mock is assigned in beforeEach
    const mockWorker = (global.Worker as unknown as jest.Mock).mock.results[0].value;
    await waitFor(() => expect(mockWorker.postMessage).toHaveBeenCalled());
  });
});
