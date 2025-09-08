import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/layout/Header';

describe('About menu', () => {
  test('renders all About links and closes on outside click', () => {
    render(<Header />);
    const aboutButton = screen.getByRole('button', { name: /about/i });
    fireEvent.click(aboutButton);

    const items = [
      'Kali Linux Overview',
      'Press Pack',
      'Wallpapers',
      'Kali Swag Store',
      'Meet The Kali Team',
      'Contact Us',
    ];

    items.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });

    fireEvent.mouseDown(document.body);

    items.forEach((item) => {
      expect(screen.queryByText(item)).not.toBeInTheDocument();
    });
  });
});

