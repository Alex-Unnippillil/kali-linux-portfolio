import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import HandshakeVisualizer from '../../../apps/reaver/components/HandshakeVisualizer';

describe('HandshakeVisualizer', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(window.navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (window.navigator as unknown as { clipboard?: unknown }).clipboard;
    }
  });

  it('renders the handshake diagram', () => {
    const { asFragment } = render(<HandshakeVisualizer />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows feedback after copying a step', () => {
    const { asFragment, getAllByRole } = render(<HandshakeVisualizer />);
    const copyButtons = getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);

    expect(asFragment()).toMatchSnapshot('copied state');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('M1')
    );
  });
});
