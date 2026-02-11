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

  const basicCases: Array<[string, string]> = [
    ['1+2', '3'],
    ['2-5', '-3'],
    ['2*3+4', '10'],
    ['2*(3+4)', '14'],
    ['10/2+3', '8'],
    ['2^3+1', '9'],
    ['2+3^2', '11'],
    ['(2+3)^2', '25'],
    ['2*3^2', '18'],
    ['2+3*4-5', '9'],
    ['5+(6*7)', '47'],
  ];

  const functionCases: Array<[string, number]> = [
    ['sin(0)', 0],
    ['cos(0)', 1],
    ['tan(0)', 0],
    ['sqrt(16)', 4],
    ['abs(-5)', 5],
    ['ceil(1.2)', 2],
    ['floor(1.8)', 1],
    ['round(2.5)', 3],
    ['log(10)', 1],
    ['ln(e)', 1],
    ['sin(pi/2)', 1],
    ['cos(pi)', -1],
  ];

  test.each(basicCases)('%s -> %s', (expr, expected) => {
    expect(calc.evaluate(expr)).toBe(expected);
  });

  test.each(functionCases)('%s -> %s', (expr, expected) => {
    expect(Number(calc.evaluate(expr))).toBeCloseTo(expected, 8);
  });

  test('handles variables', () => {
    localStorage.setItem('calc-vars', JSON.stringify({ x: '5', y: '2' }));
    expect(calc.evaluate('x+y')).toBe('7');
  });
});
