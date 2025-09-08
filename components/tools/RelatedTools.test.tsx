import { render, screen } from '@testing-library/react';
import RelatedTools from './RelatedTools';

describe('RelatedTools', () => {
  it('renders related tools from tools.json', () => {
    render(<RelatedTools toolId="dirbuster" />);
    expect(screen.getByText('GoBuster')).toBeInTheDocument();
    expect(screen.getByText('Feroxbuster')).toBeInTheDocument();
  });
});

