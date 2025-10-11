import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('figlet', () => ({
  textSync: jest.fn().mockReturnValue(''),
  parseFont: jest.fn(),
}));

jest.mock('figlet/importable-fonts/Standard.js', () => ({}), { virtual: true });
jest.mock('figlet/importable-fonts/Slant.js', () => ({}), { virtual: true });
jest.mock('figlet/importable-fonts/Big.js', () => ({}), { virtual: true });

import AsciiArtApp from '../../../apps/ascii-art';

const useRouterMock = useRouter as unknown as jest.Mock;

describe('AsciiArtApp panels and tabs', () => {
  const replaceMock = jest.fn();

  beforeEach(() => {
    replaceMock.mockReset();
    useRouterMock.mockReturnValue({
      isReady: true,
      pathname: '/apps/ascii-art',
      query: {},
      replace: replaceMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders grouped panels on the text tab', () => {
    render(<AsciiArtApp />);

    expect(screen.getByRole('heading', { name: /text styling/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /color/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Font selection')).toBeInTheDocument();
    expect(screen.getByLabelText('Font size')).toBeInTheDocument();
  });

  it('switches to the image tab and shows image controls', () => {
    render(<AsciiArtApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Image' }));

    expect(screen.getByRole('heading', { name: /image/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /color/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Adjust brightness')).toBeInTheDocument();
    expect(screen.getByLabelText('Adjust contrast')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter text')).not.toBeInTheDocument();
  });
});
