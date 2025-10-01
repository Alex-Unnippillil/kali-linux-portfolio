import { fireEvent, render, screen } from '@testing-library/react';
import PermissionPrompt from '../components/common/PermissionPrompt';

describe('PermissionPrompt component', () => {
  const baseProps = {
    open: true,
    permissionType: 'notifications' as const,
    title: 'Enable alerts?',
    summary: 'We use notifications to keep you informed.',
    reasons: [
      { title: 'Stay updated', description: 'Get notified before scheduled tweets go live.' },
      { title: 'No spam', description: 'We only notify you for events you configure.' },
    ],
    preview: <div data-testid="preview">Preview</div>,
    onDecision: jest.fn(),
  };

  beforeEach(() => {
    baseProps.onDecision = jest.fn();
  });

  it('renders reasons and preview content', () => {
    render(<PermissionPrompt {...baseProps} />);
    expect(screen.getByText('Enable alerts?')).toBeInTheDocument();
    expect(screen.getByText('Stay updated')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  it('passes remember flag when allowing access', () => {
    render(<PermissionPrompt {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Remember this choice'));
    fireEvent.click(screen.getByRole('button', { name: /allow/i }));
    expect(baseProps.onDecision).toHaveBeenCalledWith('granted', true);
  });

  it('invokes denial handler from close button without remembering', () => {
    render(<PermissionPrompt {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss permission prompt/i }));
    expect(baseProps.onDecision).toHaveBeenCalledWith('denied', false);
  });
});
