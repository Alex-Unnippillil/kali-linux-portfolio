import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QR from '../apps/qr';
import QRCode from 'qrcode';

jest.mock('qrcode');

const addImageMock = jest.fn();
const saveMock = jest.fn();

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: addImageMock,
    save: saveMock,
  })),
}));

describe('QR generator exports', () => {
  beforeEach(() => {
    (QRCode.toCanvas as jest.Mock).mockImplementation((canvas: HTMLCanvasElement) => {
      Object.defineProperty(canvas, 'toDataURL', {
        value: jest.fn().mockReturnValue('data:image/png;base64,abc'),
        configurable: true,
      });
      return Promise.resolve();
    });
    (QRCode.toString as jest.Mock).mockResolvedValue('<svg></svg>');
    HTMLCanvasElement.prototype.getContext = jest
      .fn()
      .mockReturnValue({
        clearRect: jest.fn(),
        drawImage: jest.fn(),
      });
    addImageMock.mockClear();
    saveMock.mockClear();
  });

  it('exports generated codes as images and PDF', async () => {
    const anchorMock: any = { click: jest.fn() };
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'a') {
          return anchorMock;
        }
        return originalCreateElement(tagName);
      });

    render(<QR />);

    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'hello world' },
    });

    await waitFor(() => expect(QRCode.toCanvas).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Download PNG'));
    expect(anchorMock.click).toHaveBeenCalled();
    expect(anchorMock.download).toBe('qr-256.png');

    anchorMock.click.mockClear();
    fireEvent.click(screen.getByLabelText('Download JPEG'));
    expect(anchorMock.click).toHaveBeenCalled();
    expect(anchorMock.download).toBe('qr-256.jpeg');

    fireEvent.click(screen.getByLabelText('Download PDF'));
    expect(addImageMock).toHaveBeenCalledWith(
      'data:image/png;base64,abc',
      'PNG',
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    );
    expect(saveMock).toHaveBeenCalledWith('qr-256.pdf');

    createSpy.mockRestore();
  });
});
