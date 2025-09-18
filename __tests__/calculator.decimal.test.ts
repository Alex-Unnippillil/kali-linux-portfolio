describe('calculator decimal support', () => {
  beforeAll(() => {
    const { create, all } = require('mathjs');
    global.math = create(all);
  });

  afterAll(() => {
    delete (global as any).math;
  });

  it("evaluates 0.1 + 0.2 precisely", () => {
    const calc = require('../apps/calculator/main.js');
    calc.setPreciseMode(false);
    calc.setProgrammerMode(false);
    calc.setBase(10);
    const result = calc.evaluate('0.1+0.2');
    expect(result).toBe('0.3');
  });
});
