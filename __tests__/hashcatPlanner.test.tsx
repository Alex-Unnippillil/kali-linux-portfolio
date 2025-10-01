import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import Planner, {
  RULE_SETS,
  WORDLISTS,
  simulatePlan,
} from '../components/apps/hashcat/Planner';

describe('Hashcat Planner simulation model', () => {
  it('calculates wordlist and rule candidate expansion', () => {
    const rockyou = WORDLISTS.find((w) => w.id === 'rockyou');
    const best64 = RULE_SETS.find((r) => r.id === 'best64');
    expect(rockyou).toBeDefined();
    expect(best64).toBeDefined();

    const result = simulatePlan({ wordlist: rockyou!, rule: best64!, mask: '' });
    expect(result.wordlistCandidates).toBe(rockyou!.size * best64!.multiplier);
    expect(result.maskCandidates).toBe(0);
    expect(result.candidateSpace).toBe(result.wordlistCandidates);
  });

  it('derives mask candidate space using charset products', () => {
    const baseWordlist = WORDLISTS.find((w) => w.id === 'keyboard-walks');
    const noRules = RULE_SETS.find((r) => r.id === 'none');
    expect(baseWordlist).toBeDefined();
    expect(noRules).toBeDefined();

    const result = simulatePlan({
      wordlist: baseWordlist!,
      rule: noRules!,
      mask: '?d?d?d',
    });

    expect(result.maskCandidates).toBe(1000);
    expect(result.candidateSpace).toBe(
      result.wordlistCandidates + result.maskCandidates,
    );
    expect(result.maskTokenCount).toBe(3);
  });
});

describe('Hashcat Planner UI', () => {
  it('updates runtime instantly when mask changes', () => {
    const { getByLabelText, getByTestId } = render(<Planner />);
    const maskInput = getByLabelText('Mask pattern') as HTMLInputElement;
    const runtimeBefore = getByTestId('runtime').textContent;

    fireEvent.change(maskInput, { target: { value: '?a?a?a?a?a?a?a?a' } });
    const runtimeAfter = getByTestId('runtime').textContent;

    expect(runtimeAfter).not.toEqual(runtimeBefore);
  });

  it('exports a structured JSON plan', () => {
    const { getByLabelText, getByRole, getByTestId } = render(<Planner />);

    fireEvent.change(getByLabelText('Rule set'), {
      target: { value: 'best64' },
    });
    fireEvent.change(getByLabelText('Mask pattern'), {
      target: { value: '?l?l?d?d' },
    });

    fireEvent.click(getByRole('button', { name: 'Export plan as JSON' }));
    const exported = getByTestId('export-output').textContent;
    expect(exported).toBeTruthy();

    const parsed = JSON.parse(exported || '{}');
    expect(parsed.rule.id).toBe('best64');
    expect(parsed.mask).toBe('?l?l?d?d');
    expect(parsed.simulation).toHaveProperty('candidateSpace');
    expect(parsed.simulation).toHaveProperty('wordlistCandidates');
    expect(parsed.simulation.candidateSpace).toBe(
      parsed.simulation.wordlistCandidates + parsed.simulation.maskCandidates,
    );
  });
});

