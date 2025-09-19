import React, { useMemo } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useWizardController from '../../hooks/useWizardController';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

type RouterMock = {
  pathname: string;
  query: Record<string, any>;
  isReady: boolean;
  replace: jest.Mock;
};

const createRouterMock = (initialQuery: Record<string, string> = {}): RouterMock => {
  const router: RouterMock = {
    pathname: '/hydra-preview',
    query: { ...initialQuery },
    isReady: true,
    replace: jest.fn().mockImplementation((url) => {
      if (typeof url !== 'string' && url?.query) {
        router.query = { ...url.query };
      }
      return Promise.resolve(true);
    }),
  };
  return router;
};

type WizardData = {
  target: string;
  protocol: string;
  wordlist: string;
};

const HydraWizardHarness: React.FC<{ initialTarget: string }> = ({ initialTarget }) => {
  const config = useMemo(
    () => ({
      paramName: 'step',
      steps: [
        {
          id: 'target',
          initialData: initialTarget,
          validate: ({ data }: { data: string }) => (data && data.trim() ? null : 'Target is required'),
        },
        {
          id: 'protocol',
          initialData: 'ssh',
          validate: ({ data }: { data: string }) => (data ? null : 'Protocol is required'),
        },
        {
          id: 'wordlist',
          initialData: '/tmp/list.txt',
          validate: ({ data }: { data: string }) => (data && data.trim() ? null : 'Wordlist is required'),
        },
        { id: 'review' },
      ],
    }),
    [initialTarget],
  );

  const wizard = useWizardController<WizardData>(config);

  return (
    <div>
      <div data-testid="current-step">{wizard.currentStepId}</div>
      <div data-testid="error">{wizard.stepErrors[wizard.currentStepId] ?? ''}</div>
      <button type="button" onClick={() => wizard.goToStep('review')} data-testid="jump">
        Jump to review
      </button>
    </div>
  );
};

const useRouterMock = useRouter as jest.Mock;

describe('useWizardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deep links to the requested step when prerequisites are satisfied', async () => {
    const router = createRouterMock({ step: 'review' });
    useRouterMock.mockReturnValue(router);

    render(<HydraWizardHarness initialTarget="example.com" />);

    await waitFor(() => expect(screen.getByTestId('current-step')).toHaveTextContent('review'));
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(router.query.step).toBe('review');
  });

  it('falls back to the first invalid step when deep linking past missing inputs', async () => {
    const router = createRouterMock({ step: 'review' });
    useRouterMock.mockReturnValue(router);

    render(<HydraWizardHarness initialTarget="" />);

    await waitFor(() => expect(screen.getByTestId('current-step')).toHaveTextContent('target'));
    expect(screen.getByTestId('error')).toHaveTextContent('Target is required');
    expect(router.query.step).toBe('target');
    const replaceCalls = router.replace.mock.calls as Array<[
      Record<string, any>,
      unknown,
      Record<string, unknown>
    ]>;
    const hasFallback = replaceCalls.some(([url]) => typeof url !== 'string' && url?.query?.step === 'target');
    expect(hasFallback).toBe(true);
  });

  it('prevents manual navigation beyond invalid steps', async () => {
    const router = createRouterMock();
    useRouterMock.mockReturnValue(router);

    render(<HydraWizardHarness initialTarget="" />);

    await waitFor(() => expect(screen.getByTestId('current-step')).toHaveTextContent('target'));
    const user = userEvent.setup();
    await user.click(screen.getByTestId('jump'));

    expect(screen.getByTestId('current-step')).toHaveTextContent('target');
    expect(screen.getByTestId('error')).toHaveTextContent('Target is required');
  });
});
