import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AesGcmDemo from '../../../apps/crypto-toolkit/components/AesGcmDemo';

describe('AesGcmDemo', () => {
  const originalCrypto = global.crypto;
  const originalWindowCrypto = window.crypto;
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  const saltBytes = Array.from({ length: 16 }, (_, index) => index + 1);
  const ivBytes = Array.from({ length: 12 }, (_, index) => index + 21);

  const setupCrypto = () => {
    const importKey = jest.fn(async () => ({}));
    const deriveKey = jest.fn(async () => ({}));
    const encrypt = jest.fn(async () => new Uint8Array([222, 173, 190, 239]).buffer);
    const decrypt = jest.fn(async () => new TextEncoder().encode('attack at dawn').buffer);

    let offset = 0;
    const values = [...saltBytes, ...ivBytes];
    const getRandomValues = jest.fn((array: Uint8Array) => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = values[offset % values.length];
        offset += 1;
      }
      return array;
    });

    const subtle = { importKey, deriveKey, encrypt, decrypt } as Crypto['subtle'];
    const crypto = { subtle, getRandomValues } as Crypto;

    Object.defineProperty(global, 'crypto', {
      value: crypto,
      configurable: true,
    });
    Object.defineProperty(window, 'crypto', {
      value: crypto,
      configurable: true,
    });

    return { importKey, deriveKey, encrypt, decrypt, getRandomValues };
  };

  beforeEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
      Object.defineProperty(window, 'crypto', {
        value: originalWindowCrypto,
        configurable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (global as any).crypto;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as any).crypto;
    }

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (navigator as any).clipboard;
    }
  });

  it('encrypts, stores, copies, and decrypts using Web Crypto', async () => {
    const mocks = setupCrypto();
    const clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });

    render(<AesGcmDemo />);

    fireEvent.change(screen.getByLabelText(/plaintext/i), {
      target: { value: 'attack at dawn' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'hunter2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /encrypt/i }));

    await waitFor(() => expect(mocks.encrypt).toHaveBeenCalled());
    await screen.findByText('3q2+7w==');

    const stored = sessionStorage.getItem('crypto-toolkit:aes-gcm');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? '{}')).toMatchObject({
      ciphertext: '3q2+7w==',
      salt: 'AQIDBAUGBwgJCgsMDQ4PEA==',
      iv: 'FRYXGBkaGxwdHh8g',
      iterations: 120000,
    });

    fireEvent.click(screen.getByRole('button', { name: /copy ciphertext/i }));
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith('3q2+7w=='));

    fireEvent.click(screen.getByRole('button', { name: /copy parameters/i }));
    await waitFor(() =>
      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('"salt": "AQIDBAUGBwgJCgsMDQ4PEA=="'),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /decrypt/i }));

    await waitFor(() => expect(mocks.decrypt).toHaveBeenCalled());
    await screen.findByText(/decryption successful/i);
    const decryptedPanel = screen.getByText(/decrypted plaintext/i).parentElement as HTMLElement;
    expect(within(decryptedPanel).getByText('attack at dawn')).toBeInTheDocument();
    expect(mocks.getRandomValues).toHaveBeenCalledTimes(2);
  });

  it('reports an error when decryption fails with a bad password', async () => {
    const mocks = setupCrypto();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    render(<AesGcmDemo />);

    fireEvent.change(screen.getByLabelText(/plaintext/i), {
      target: { value: 'classified' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correct horse battery staple' },
    });

    fireEvent.click(screen.getByRole('button', { name: /encrypt/i }));
    await waitFor(() => expect(mocks.encrypt).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'bad password' },
    });
    mocks.decrypt.mockRejectedValueOnce(new Error('decryption failed'));

    fireEvent.click(screen.getByRole('button', { name: /decrypt/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/unable to decrypt/i);
    expect(screen.queryByText(/decryption successful/i)).not.toBeInTheDocument();
  });
});
