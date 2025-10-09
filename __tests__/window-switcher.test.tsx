import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher previews', () => {
  const baseWindows = [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: '/themes/Yaru/apps/bash.png',
      preview: 'data:image/png;base64,AAAA',
    },
    {
      id: 'firefox',
      title: 'Firefox',
      icon: '/themes/Yaru/apps/firefox.svg',
      preview: null,
    },
  ];

  it('renders thumbnail previews with icons and layout styles', () => {
    const onSelect = jest.fn();
    render(<WindowSwitcher windows={baseWindows} onSelect={onSelect} onClose={jest.fn()} />);

    const items = screen.getAllByTestId('window-switcher-item');
    expect(items).toHaveLength(baseWindows.length);
    expect(items[0].className).toContain('flex');
    expect(items[0].className).toContain('items-center');

    const previewContainers = screen.getAllByTestId('window-switcher-preview');
    expect(previewContainers[0].className).toContain('h-20');
    expect(previewContainers[0].className).toContain('w-32');

    const previewImage = within(previewContainers[0]).getByRole('img', {
      name: 'Terminal window preview',
    });
    expect(previewImage).toHaveAttribute('src', baseWindows[0].preview as string);

    const iconImage = within(previewContainers[0]).getByRole('img', {
      name: 'Terminal icon',
    });
    expect(iconImage).toHaveAttribute('src', baseWindows[0].icon);

    fireEvent.click(items[0]);
    expect(onSelect).toHaveBeenCalledWith('terminal');
  });

  it('uses the fallback image when previews are unavailable', () => {
    render(<WindowSwitcher windows={baseWindows} onSelect={jest.fn()} onClose={jest.fn()} />);

    const fallbackPreview = screen.getByRole('img', {
      name: 'Firefox window preview',
    });
    expect(fallbackPreview).toHaveAttribute('src', '/images/window-preview-fallback.svg');
  });
});
