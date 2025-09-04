import { render, screen, fireEvent } from '@testing-library/react';
import Whisker, { AppItem } from '@/components/menu/Whisker';

describe('Whisker menu', () => {
  const apps: AppItem[] = [
    { id: 'nmap', name: 'Nmap', category: 'Information Gathering', favorite: true },
    { id: 'hydra', name: 'Hydra', category: 'Password Attacks' },
    { id: 'wireshark', name: 'Wireshark', category: 'Information Gathering', recent: true },
  ];

  it('filters apps by category and marks the active category', () => {
    render(<Whisker apps={apps} />);

    // All Applications shown by default
    expect(screen.getByText('Nmap')).toBeInTheDocument();
    expect(screen.getByText('Hydra')).toBeInTheDocument();
    expect(screen.getByText('Wireshark')).toBeInTheDocument();

    // Favorites filter
    fireEvent.click(screen.getByText('Favorites'));
    const favButton = screen.getByText('Favorites');
    expect(favButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Nmap')).toBeInTheDocument();
    expect(screen.queryByText('Hydra')).toBeNull();

    // Category filter
    fireEvent.click(screen.getByText('Information Gathering'));
    const infoButton = screen.getByText('Information Gathering');
    expect(infoButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Nmap')).toBeInTheDocument();
    expect(screen.getByText('Wireshark')).toBeInTheDocument();
    expect(screen.queryByText('Hydra')).toBeNull();
  });
});

