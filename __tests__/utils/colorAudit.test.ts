import { auditDocument, contrastRatio, parseColor } from '../../utils/colorAudit';

const mockRect = (element: HTMLElement) => {
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 120,
      bottom: 24,
      width: 120,
      height: 24,
      toJSON: () => {},
    }) as DOMRect;
};

describe('colorAudit utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
  });

  it('computes contrast ratios using WCAG formula', () => {
    const white = parseColor('#ffffff');
    const black = parseColor('#000000');
    expect(white).not.toBeNull();
    expect(black).not.toBeNull();
    expect(contrastRatio(white!, black!)).toBeCloseTo(21, 5);
  });

  it('detects text below the minimum contrast threshold', () => {
    document.body.style.backgroundColor = '#F6F6F5';

    const failing = document.createElement('div');
    failing.textContent = 'Low contrast copy';
    Object.assign(failing.style, {
      color: '#7D7F83',
      backgroundColor: '#F6F6F5',
      fontSize: '16px',
    });
    mockRect(failing);
    document.body.appendChild(failing);

    const passing = document.createElement('div');
    passing.textContent = 'Accessible text';
    Object.assign(passing.style, {
      color: '#333333',
      backgroundColor: '#F6F6F5',
      fontSize: '16px',
    });
    mockRect(passing);
    document.body.appendChild(passing);

    const reports = auditDocument(document);
    expect(reports).toHaveLength(1);
    const [issue] = reports;
    expect(issue.text).toContain('Low contrast');
    expect(issue.ratio).toBeLessThan(issue.threshold);
    expect(issue.foreground).toBe('#7D7F83');
    expect(issue.background).toBe('#F6F6F5');
  });

  it('maps failing colors to token suggestions', () => {
    document.body.style.backgroundColor = '#F6F6F5';

    const paragraph = document.createElement('p');
    paragraph.textContent = 'Needs better contrast';
    Object.assign(paragraph.style, {
      color: '#7D7F83',
      backgroundColor: '#F6F6F5',
      fontSize: '16px',
    });
    mockRect(paragraph);
    document.body.appendChild(paragraph);

    const reports = auditDocument(document);
    expect(reports).toHaveLength(1);
    const [issue] = reports;
    expect(issue).toBeDefined();
    expect(issue.tokenLink?.token).toBe('--color-ub-warm-grey');
    expect(issue.suggestions.length).toBeGreaterThan(0);
    const suggestionTokens = issue.suggestions.map(suggestion => suggestion.token);
    expect(suggestionTokens).toContain('--color-ubt-cool-grey');
  });
});
