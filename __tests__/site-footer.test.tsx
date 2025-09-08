import { render, screen } from '@testing-library/react';
import SiteFooter from '../components/footer/SiteFooter';

describe('SiteFooter', () => {
  test('renders all sections', () => {
    render(<SiteFooter />);
    expect(
      screen.getByRole('heading', { name: /get kali/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /documentation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /community/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /legal/i })).toBeInTheDocument();
  });

  test('includes trademark policy link and fan-site note', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /trademark policy/i });
    expect(link).toHaveAttribute(
      'href',
      'https://www.kali.org/docs/policy/trademark/'
    );
    expect(screen.getByText(/fan site/i)).toBeInTheDocument();
  });
});

