import { render, screen } from '@testing-library/react';
import TerminalSection from '../components/mdx/TerminalSection';

describe('TerminalSection', () => {
  it('renders text inside terminal output', () => {
    render(<TerminalSection ariaLabel="demo">echo test</TerminalSection>);
    expect(screen.getByLabelText('demo')).toHaveTextContent('echo test');
  });
});
