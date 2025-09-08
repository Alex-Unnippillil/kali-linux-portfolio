import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Status from '../components/util-components/status';
import { useSettings } from '../hooks/useSettings';
import { useTray } from '../hooks/useTray';

jest.mock('../hooks/useSettings');
jest.mock('../hooks/useTray');

type SettingsReturn = {
  allowNetwork: boolean;
  theme: string;
  symbolicTrayIcons: boolean;
};

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockUseTray = useTray as jest.MockedFunction<typeof useTray>;

const setupMocks = (theme: string) => {
  mockUseSettings.mockReturnValue({
    allowNetwork: true,
    theme,
    symbolicTrayIcons: false,
  } as SettingsReturn);

  mockUseTray.mockReturnValue({
    icons: [
      { id: 'network', tooltip: 'Network', legacy: '/n.svg' },
      { id: 'volume', tooltip: 'Volume', legacy: '/v.svg' },
      { id: 'battery', tooltip: 'Battery', legacy: '/b.svg' },
    ],
    register: jest.fn(),
    unregister: jest.fn(),
  });
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe('Status indicators', () => {
  test('render 20px modules in dark theme', () => {
    setupMocks('kali-dark');
    render(<Status />);
    const icons = screen.getAllByRole('img');
    icons.forEach((icon) => {
      expect(icon).toHaveClass('w-5');
      expect(icon).toHaveClass('h-5');
    });
  });

  test('render 20px modules in light theme', () => {
    setupMocks('kali-light');
    render(<Status />);
    const icons = screen.getAllByRole('img');
    icons.forEach((icon) => {
      expect(icon).toHaveClass('w-5');
      expect(icon).toHaveClass('h-5');
    });
  });
});
