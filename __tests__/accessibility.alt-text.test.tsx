import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';
import CaseWalkthrough from '../apps/autopsy/components/CaseWalkthrough';
import BluetoothApp from '../components/apps/bluetooth';

jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: ({ src, alt, ...rest }: any) => (
      <img src={typeof src === 'string' ? src : ''} alt={alt} {...rest} />
    ),
  };
});

const mockFetch = jest.fn();
const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});

afterEach(() => {
  mockFetch.mockReset();
  global.fetch = originalFetch;
});

const mockJsonResponse = (data: unknown) =>
  Promise.resolve({
    json: async () => data,
  } as Response);

describe('alt text coverage', () => {
  it('keeps window switcher previews and icons labeled', async () => {
    render(
      <WindowSwitcher
        windows={[
          {
            id: 'terminal',
            title: 'Terminal',
            icon: '/icons/terminal.png',
            preview: '/previews/terminal.png',
          },
        ]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Terminal preview')).toBeInTheDocument();
    });

    expect(screen.getByAltText('Terminal icon')).toBeInTheDocument();
  });

  it('describes autopsy timeline and file thumbnails', () => {
    render(<CaseWalkthrough />);

    expect(
      screen.getByAltText('resume.docx created on desktop icon')
    ).toBeInTheDocument();
    expect(screen.getByAltText('resume.docx icon')).toBeInTheDocument();
  });

  it('labels bluetooth device placeholders during scans', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(
        mockJsonResponse([
          {
            address: 'AA:BB:CC:DD:EE:FF',
            name: 'Trackpad',
            rssi: -55,
            class: 'Peripherals',
          },
        ])
      );
    global.fetch = mockFetch as unknown as typeof fetch;

    render(<BluetoothApp />);

    fireEvent.click(screen.getByRole('button', { name: /scan for devices/i }));

    fireEvent.click(await screen.findByRole('button', { name: /allow/i }));

    const icons = await screen.findAllByAltText('Bluetooth device placeholder icon');
    expect(icons.length).toBeGreaterThan(0);
  });
});
