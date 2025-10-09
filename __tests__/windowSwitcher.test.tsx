import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher', () => {
  const baseWindows = [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: './themes/Yaru/apps/bash.png',
    },
    {
      id: 'firefox',
      title: 'Firefox',
      icon: '/themes/Yaru/apps/firefox.svg',
    },
  ];

  it('renders window icons alongside titles', () => {
    const handleSelect = jest.fn();
    const { asFragment, getByAltText } = render(
      <WindowSwitcher windows={baseWindows} onSelect={handleSelect} />
    );

    expect(getByAltText('Terminal icon')).toBeInTheDocument();
    expect(getByAltText('Firefox icon')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('retains icon markup when filtering results', () => {
    const { asFragment, getByPlaceholderText } = render(
      <WindowSwitcher windows={baseWindows} />
    );

    fireEvent.change(getByPlaceholderText('Search windows'), {
      target: { value: 'term' },
    });

    expect(asFragment()).toMatchSnapshot();
  });
});
