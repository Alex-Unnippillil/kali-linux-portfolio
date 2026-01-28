const { JSDOM } = require('jsdom');

describe('calculator parser', () => {
  let calc: any;

  beforeAll(() => {
    const dom = new JSDOM('<!doctype html><html><body><input id="display" /></body></html>');
    global.window = dom.window as any;
    global.document = dom.window.document as any;
    calc = require('../../apps/calculator/main.js');
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
    ['sin(0)', Math.sin(0)],
    ['cos(0)', Math.cos(0)],
    ['tan(0)', Math.tan(0)],
    ['sqrt(16)', Math.sqrt(16)],
    ['abs(-5)', Math.abs(-5)],
    ['ceil(1.2)', Math.ceil(1.2)],
    ['floor(1.8)', Math.floor(1.8)],
    ['round(2.5)', Math.round(2.5)],
    ['exp(1)', Math.exp(1)],
    ['log(10)', Math.log10(10)],
    ['sin(pi/2)', Math.sin(Math.PI / 2)],
    ['cos(pi)', Math.cos(Math.PI)],
  ];
  const cases: Array<[string, string]> = [
    ...basicCases.map((expr) => [expr, String(eval(expr.replace('^', '**')))]),
    ...functionCases.map(([expr, expected]) => [expr, String(expected)]),
  ];

  test.each(cases)('%s -> %s', (expr, expected) => {
    expect(calc.evaluate(expr)).toBe(expected);
  });

  test('handles variables', () => {
    localStorage.setItem('calc-vars', JSON.stringify({ x: '5', y: '2' }));
    expect(calc.evaluate('x+y')).toBe('7');
  });
});
