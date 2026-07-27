import { render, screen } from '@testing-library/react';
import MirrorsPage from '../pages/mirrors';
import { useMirrors } from '../hooks/useMirrors';

jest.mock('../hooks/useMirrors');

const mockedUseMirrors = useMirrors as jest.MockedFunction<typeof useMirrors>;

describe('MirrorsPage', () => {
  it('shows skeleton while loading', () => {
    mockedUseMirrors.mockReturnValue({ mirrors: null, isLoading: true, error: undefined } as any);
    render(<MirrorsPage />);
    expect(screen.getByTestId('mirrors-skeleton')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockedUseMirrors.mockReturnValue({ mirrors: null, isLoading: false, error: new Error('fail') } as any);
    render(<MirrorsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load mirrors/i);
  });
});
