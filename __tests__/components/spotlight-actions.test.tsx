import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WhiskerMenu from '../../components/menu/WhiskerMenu';
import {
  executeSpotlightAction,
  registerSpotlightAction,
  __TEST_ONLY__resetSpotlightRegistry,
} from '../../components/screen/spotlight-actions';

describe('spotlight actions registry', () => {
  afterEach(() => {
    __TEST_ONLY__resetSpotlightRegistry();
  });

  it('executes a registered action and returns success metadata', async () => {
    registerSpotlightAction({
      id: 'test-action',
      title: 'Test Action',
      description: 'Verify registry execution',
      run: () => ({ status: 'success', message: 'all good' }),
    });

    const result = await executeSpotlightAction('test-action');
    expect(result.status).toBe('success');
    expect(result.message).toBe('all good');
  });

  it('converts thrown errors into error results', async () => {
    registerSpotlightAction({
      id: 'error-action',
      title: 'Throwing Action',
      run: () => {
        throw new Error('boom');
      },
    });

    const result = await executeSpotlightAction('error-action');
    expect(result.status).toBe('error');
    expect(result.message).toContain('boom');
  });
});

describe('Spotlight quick actions UI', () => {
  afterEach(() => {
    __TEST_ONLY__resetSpotlightRegistry();
  });

  it('shows success feedback when an action completes', async () => {
    const unregister = registerSpotlightAction({
      id: 'diagnostics-action',
      title: 'Run Diagnostics',
      description: 'Check system health',
      keywords: ['diagnostics'],
      run: () => ({ status: 'success', message: 'Diagnostics complete' }),
    });

    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const input = await screen.findByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'diagnostics' } });

    const actionLabel = await screen.findByText('Run Diagnostics');
    fireEvent.click(actionLabel.closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText('Diagnostics complete')).toBeInTheDocument();
    });

    unregister();
  });

  it('surfaces error feedback when an action fails', async () => {
    const unregister = registerSpotlightAction({
      id: 'cache-failure',
      title: 'Failing Action',
      description: 'Always fails',
      keywords: ['fail-case'],
      run: () => ({ status: 'error', message: 'Operation failed' }),
    });

    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    const input = await screen.findByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'fail-case' } });

    const actionLabel = await screen.findByText('Failing Action');
    fireEvent.click(actionLabel.closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText('Operation failed')).toBeInTheDocument();
    });

    unregister();
  });
});
