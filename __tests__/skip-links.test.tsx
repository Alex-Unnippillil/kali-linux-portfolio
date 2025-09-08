import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Home from '../pages/index.jsx';

describe('skip link and landmarks', () => {
  it('includes skip link in _app', () => {
    const content = fs.readFileSync(path.join(__dirname, '../pages/_app.tsx'), 'utf8');
    expect(content).toContain('<a href="#main" className="skip-link">Skip to content</a>');
  });

  it('renders nav, main and footer roles', () => {
    render(
      <>
        <Header />
        <Home desktops={[]} />
        <Footer />
      </>
    );
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(screen.getAllByRole('contentinfo').length).toBeGreaterThan(0);
  });
});
