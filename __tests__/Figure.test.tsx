import { render, screen } from '@testing-library/react';
import Figure from '../components/ui/Figure';

describe('Figure', () => {
  test('renders image with caption', () => {
    render(<Figure src="/test.png" alt="Test image" caption="Caption" />);
    expect(screen.getByRole('img', { name: /test image/i })).toBeInTheDocument();
    expect(screen.getByText('Caption')).toBeInTheDocument();
  });
});
