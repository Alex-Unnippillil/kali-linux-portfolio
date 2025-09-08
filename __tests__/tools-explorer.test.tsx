import { fireEvent, render, screen } from '@testing-library/react';
import ToolsExplorer from '../pages/tools';

describe('ToolsExplorer', () => {
  test('fuzzy search finds tools', () => {
    render(<ToolsExplorer />);
    const input = screen.getByPlaceholderText(/search tools/i);
    fireEvent.change(input, { target: { value: 'ferox' } });
    expect(screen.getByText('Feroxbuster')).toBeInTheDocument();
    expect(screen.queryByText('DirBuster')).toBeNull();
  });

  test('filters by category', () => {
    render(<ToolsExplorer />);
    const dnsButton = screen.getAllByRole('button', { name: /dns/i })[0];
    fireEvent.click(dnsButton);
    expect(screen.getByText('GoBuster')).toBeInTheDocument();
    expect(screen.queryByText('DirBuster')).toBeNull();
  });

  test('filters by platform', () => {
    render(<ToolsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /windows/i }));
    expect(screen.getByText('DirBuster')).toBeInTheDocument();
    expect(screen.queryByText('GoBuster')).toBeNull();
  });

  test('filters by tag', () => {
    render(<ToolsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /rust/i }));
    expect(screen.getByText('Feroxbuster')).toBeInTheDocument();
    expect(screen.queryByText('GoBuster')).toBeNull();
  });
});

