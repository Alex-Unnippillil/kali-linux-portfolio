import { render, screen, fireEvent, act } from '@testing-library/react';
import QRTool from '../components/apps/qr_tool';
import { logEvent } from '../utils/ga';

jest.mock('../utils/ga');
jest.mock('qrcode', () => ({ toCanvas: jest.fn((_, __, ___, cb) => cb && cb(null)) }), { virtual: true });
jest.mock('jsqr', () => jest.fn(() => ({ data: 'decoded' })), { virtual: true });

describe('QRTool', () => {
  it('logs events and has accessible root', async () => {
    render(<QRTool />);
    const root = screen.getByRole('application', { name: 'QR Tool' });
    expect(root).toBeInTheDocument();
    expect(logEvent).toHaveBeenCalledWith('app_open', { id: 'qr_tool' });
    const input = screen.getByLabelText('Text to encode');
    fireEvent.change(input, { target: { value: 'hello' } });
    const btn = screen.getByRole('button', { name: /generate/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(logEvent).toHaveBeenCalledWith('app_action', { id: 'qr_tool', action: 'generate' });
  });
});
