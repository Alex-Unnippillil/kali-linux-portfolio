const { JSDOM } = require('jsdom');
const { create, all } = require('mathjs');
const math = create(all);

describe('calculator parser', () => {
  let calc: any;

  beforeAll(async () => {
    const dom = new JSDOM('<!doctype html><html><body><input id="display" /></body></html>');
    global.window = dom.window as any;
    global.document = dom.window.document as any;
    global.math = math;
    calc = await import('../../apps/calculator/main.js');
    calc.setPreciseMode(false);
  });

  beforeEach(() => {
    localStorage.clear();
  });

  const basicCases = [
    '1+2',
    '2-5',
    '2*3+4',
    '2*(3+4)',
    '10/2+3',
    '2^3+1',
    '2+3^2',
    '(2+3)^2',
    '2*3^2',
    '2+3*4-5',
    '5+(6*7)',
  ];

  const functionCases = [
    'sin(0)',
    'cos(0)',
    'tan(0)',
    'sqrt(16)',
    'abs(-5)',
    'ceil(1.2)',
    'floor(1.8)',
    'round(2.5)',
    'exp(1)',
    'log(10)',
    'sin(pi/2)',
    'cos(pi)',
  ];

  const unitCases = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return `${n}cm + ${n}cm`;
  });

  const cases: Array<[string, string]> = [...basicCases, ...functionCases, ...unitCases].map(
    (expr) => {
      const expected = math.evaluate(expr.replace(/(\d)([a-zA-Z]+)/g, '$1 $2')).toString();
      return [expr, expected];
    }
  );

  test.each(cases)('%s -> %s', (expr, expected) => {
    expect(calc.evaluate(expr)).toBe(expected);
  });

  test('handles variables', () => {
    localStorage.setItem('calc-vars', JSON.stringify({ x: '5', y: '2' }));
    expect(calc.evaluate('x+y')).toBe('7');
  });
});

