import { render, screen, within } from '@testing-library/react';
import ExplainView from '../../../apps/regex-tester/components/ExplainView';

describe('ExplainView', () => {
  it('prompts for a pattern when empty', () => {
    render(<ExplainView pattern="" flags="" />);

    expect(screen.getByText(/enter a pattern/i)).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('shows parser errors without crashing', () => {
    render(<ExplainView pattern="(" flags="" />);

    expect(screen.getByText(/parser error/i)).toBeInTheDocument();
    expect(screen.getByText(/unterminated group/i)).toBeInTheDocument();
  });

  it('renders nested groups with proper hierarchy', () => {
    const pattern = String.raw`^(?<outer>(\w+)(?:-(?<inner>(?:foo|bar(?:baz|qux))))?)$`;

    render(<ExplainView pattern={pattern} flags="" />);

    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByText('Capturing group #1 <outer>')).toBeInTheDocument();
    expect(screen.getByText('Capturing group #2')).toBeInTheDocument();
    expect(screen.getByText('Capturing group #3 <inner>')).toBeInTheDocument();

    // The optional hyphen and inner group should be represented as a quantifier.
    expect(screen.getByText('Zero or one time')).toBeInTheDocument();
    const literalNodes = screen.getAllByText('\\w+');
    expect(literalNodes.length).toBeGreaterThan(0);

    const optionHeaders = screen.getAllByText('Option 2');
    const nestedOptionHeader = optionHeaders.find((header) => {
      const treeItem = header.closest('li');
      return treeItem ? within(treeItem).queryByText('bar(?:baz|qux)') : null;
    });

    expect(nestedOptionHeader).toBeDefined();
    if (nestedOptionHeader) {
      const treeItem = nestedOptionHeader.closest('li');
      expect(treeItem).not.toBeNull();
      if (treeItem) {
        expect(within(treeItem).getByText('Non-capturing group')).toBeInTheDocument();
        expect(within(treeItem).getByText('bar(?:baz|qux)')).toBeInTheDocument();
      }
    }
  });
});
