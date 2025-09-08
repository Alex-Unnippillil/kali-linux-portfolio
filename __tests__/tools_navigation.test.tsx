import { render, screen } from '@testing-library/react';
import ToolsPage from '../pages/tools';

test('renders alphabet navigation with accessible anchors', () => {
  render(<ToolsPage />);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  letters.forEach((letter) => {
    const link = screen.getByRole('link', { name: letter });
    expect(link).toHaveAttribute('href', `#${letter}`);
  });
});

