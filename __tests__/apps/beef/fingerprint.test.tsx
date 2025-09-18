import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BeefPage from '../../../apps/beef';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('BeEF fingerprint panel', () => {
  const renderBeef = () => render(<BeefPage />);

  test('updates fingerprint values when the iframe posts data', () => {
    renderBeef();

    const payload = {
      userAgent: 'Mozilla/5.0 (Test Agent)',
      language: 'fr-FR',
      timezone: 'Europe/Paris',
    };

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            source: 'beef-demo',
            type: 'beef:fingerprint',
            payload,
          },
        })
      );
    });

    expect(screen.getByTestId('fingerprint-userAgent')).toHaveTextContent(payload.userAgent);
    expect(screen.getByTestId('fingerprint-language')).toHaveTextContent(payload.language);
    expect(screen.getByTestId('fingerprint-timezone')).toHaveTextContent(payload.timezone);
  });

  test('copy buttons write fingerprint values to the clipboard', async () => {
    const originalClipboard = (navigator as any).clipboard;
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    renderBeef();

    const payload = {
      userAgent: 'Test UA',
      language: 'de-DE',
      timezone: 'Europe/Berlin',
    };

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            source: 'beef-demo',
            type: 'beef:fingerprint',
            payload,
          },
        })
      );
    });

    const copyButton = screen.getByRole('button', { name: /copy user agent/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith(payload.userAgent);
    expect(copyButton).toHaveTextContent(/copied!/i);

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as any).clipboard;
    }
  });

  test('sends emulator settings to the demo iframe when profile changes', () => {
    renderBeef();

    const iframe = screen.getByTitle(/demo target/i) as HTMLIFrameElement;
    const postMessage = jest.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: { postMessage },
    });

    act(() => {
      fireEvent.load(iframe);
    });

    postMessage.mockClear();

    const profileSelect = screen.getByLabelText(/emulator profile/i);
    fireEvent.change(profileSelect, { target: { value: 'mobile-safari' } });

    expect(postMessage).toHaveBeenCalled();
    const [message, target] = postMessage.mock.calls[0];
    expect(target).toBe('*');
    expect(message).toMatchObject({
      type: 'beef:apply-emulator',
      payload: expect.objectContaining({
        userAgent: expect.any(String),
        language: expect.any(String),
        timezone: expect.any(String),
      }),
    });
  });
});
