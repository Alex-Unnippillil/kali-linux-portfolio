import { render, screen } from '@testing-library/react';
import Callout from '../components/ui/Callout';

describe('Callout', () => {
  test('renders with appropriate role and label', () => {
    render(<Callout title="Info">Hello</Callout>);
    const callout = screen.getByRole('status', { name: /info/i });
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('Hello');
  });
});
