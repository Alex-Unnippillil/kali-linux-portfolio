import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import QRTool from '../components/apps/qr_tool';
import QRCode from 'qrcode';

jest.mock('qrcode');

describe('QRTool generator', () => {
  beforeEach(() => {
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,abc');
    (QRCode.toString as jest.Mock).mockResolvedValue('<svg></svg>');
  });

  it('generates preview and batch items', async () => {
    const { getByLabelText, getByText } = render(<QRTool />);
    fireEvent.change(getByLabelText('Text'), { target: { value: 'hello' } });
    await waitFor(() => expect(QRCode.toDataURL).toHaveBeenCalled());

    fireEvent.change(getByLabelText(/Batch CSV/), { target: { value: 'hello,first' } });
    fireEvent.click(getByText('Generate Batch'));
    await waitFor(() => expect(getByText('first')).toBeInTheDocument());
  });
});
