jest.mock('../utils/statusToast', () => ({
  dispatchStatusToast: jest.fn(),
  subscribeStatusToast: jest.fn(() => () => {}),
}));

const { dispatchStatusToast } = require('../utils/statusToast');

function loadCalculator() {
  delete require.cache[require.resolve('../apps/calculator/main.js')];
  return require('../apps/calculator/main.js');
}

describe('calculator memory helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.math = require('mathjs');
  });

  afterEach(() => {
    delete global.math;
  });

  it('tracks memory using decimal arithmetic and emits toasts on updates', () => {
    const calc = loadCalculator();
    const { memoryAdd, memorySubtract, memoryRecall, memoryClear } = calc;

    expect(memoryRecall()).toBe('0');

    memoryAdd('0.1');
    memoryAdd('0.2');
    expect(memoryRecall()).toBe('0.3');

    memorySubtract('0.05');
    expect(memoryRecall()).toBe('0.25');

    expect(dispatchStatusToast).toHaveBeenNthCalledWith(1, 'Memory updated: 0.1');
    expect(dispatchStatusToast).toHaveBeenNthCalledWith(2, 'Memory updated: 0.3');
    expect(dispatchStatusToast).toHaveBeenNthCalledWith(3, 'Memory updated: 0.25');

    memoryClear();
    expect(memoryRecall()).toBe('0');
    expect(dispatchStatusToast).toHaveBeenNthCalledWith(4, 'Memory cleared');
  });

  it('ignores invalid expressions without mutating memory', () => {
    const calc = loadCalculator();
    const { memoryAdd, memoryRecall } = calc;

    expect(memoryRecall()).toBe('0');
    memoryAdd('not a number');
    expect(memoryRecall()).toBe('0');
    expect(dispatchStatusToast).not.toHaveBeenCalled();
  });
});
