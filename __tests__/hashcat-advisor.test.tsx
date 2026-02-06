import React from 'react';
import { render, screen } from '@testing-library/react';
import HashcatAdvisor, {
  advisorRules,
  type AdvisorContext,
} from '../components/apps/hashcat/Advisor';

jest.mock('@/lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

const trackEvent = require('@/lib/analytics-client').trackEvent as jest.Mock;

const baseContext: AdvisorContext = {
  hashTypeId: '0',
  attackMode: '0',
  ruleSet: 'none',
  mask: '',
  maskStats: { count: 0, time: 0 },
  wordlist: 'rockyou',
  pattern: '',
  maskModeActive: false,
};

describe('HashcatAdvisor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  });

  it('renders bcrypt guidance when bcrypt is selected', () => {
    render(<HashcatAdvisor {...baseContext} hashTypeId="3200" />);
    expect(
      screen.getByText(/bcrypt hashes are intentionally slow/i),
    ).toBeInTheDocument();
  });

  it('shows fallback copy when no rules apply', () => {
    render(<HashcatAdvisor {...baseContext} />);
    expect(
      screen.getByText(/This advisor surfaces general guidance/i),
    ).toBeInTheDocument();
  });

  it('encourages providing a mask when brute-force mode is active without one', () => {
    render(
      <HashcatAdvisor
        {...baseContext}
        attackMode="3"
        maskModeActive
      />,
    );
    expect(screen.getByTestId('advisor-tip-mask-required')).toBeInTheDocument();
  });

  it('tracks analytics when tips are visible and analytics are enabled', () => {
    render(<HashcatAdvisor {...baseContext} hashTypeId="3200" />);
    expect(trackEvent).toHaveBeenCalledWith(
      'hashcat_tip_impression',
      expect.objectContaining({ rules: expect.stringContaining('hash-type-bcrypt') }),
    );
  });

  it('covers every rule with an explicit context', () => {
    const contexts: Record<string, AdvisorContext> = {
      'hash-type-bcrypt': { ...baseContext, hashTypeId: '3200' },
      'mask-required': { ...baseContext, attackMode: '3', maskModeActive: true },
      'mask-large-space': {
        ...baseContext,
        mask: '?d?d?d',
        maskModeActive: true,
        maskStats: { count: 1_000_000_001, time: 0 },
      },
      'rules-enabled': { ...baseContext, ruleSet: 'best64' },
      'wordlist-missing': { ...baseContext, wordlist: '' },
      'pattern-present': { ...baseContext, pattern: 'abc' },
    };

    advisorRules.forEach((rule) => {
      const context = contexts[rule.id];
      expect(context).toBeDefined();
      expect(rule.test(context)).toBe(true);
    });
  });
});
