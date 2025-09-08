import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import ScreenshotHUD from '../src/components/screenshot/ScreenshotHUD';
import html2canvas from 'html2canvas';

jest.mock('html2canvas');

const html2canvasMock = html2canvas as unknown as jest.Mock;

describe('ScreenshotHUD', () => {
  beforeEach(() => {
    html2canvasMock.mockReset();
    html2canvasMock.mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,abc',
    });
  });

  it('closes on Escape key', () => {
    const onClose = jest.fn();
    render(<ScreenshotHUD onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('captures selected region and downloads', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ScreenshotHUD onClose={onClose} />);
    const overlay = getByTestId('screenshot-hud');
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.mouseDown(overlay, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(overlay, { clientX: 60, clientY: 40 });
    fireEvent.mouseUp(overlay);

    await waitFor(() => expect(html2canvasMock).toHaveBeenCalled());
    expect(html2canvasMock).toHaveBeenCalledWith(
      document.body,
      expect.objectContaining({ x: 10, y: 10, width: 50, height: 30 })
    );
    expect(clickSpy).toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
