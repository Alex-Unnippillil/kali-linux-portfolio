import { add, subtract, multiply, divide, pow } from '../utils/decimal';

describe('decimal arithmetic', () => {
  test('addition', () => {
    expect(add(0.1, 0.2).toString()).toBe('0.3');
  });
  test('subtraction', () => {
    expect(subtract(0.3, 0.1).toString()).toBe('0.2');
  });
  test('multiplication', () => {
    expect(multiply(0.6, 3).toString()).toBe('1.8');
  });
  test('division', () => {
    expect(divide(0.3, 0.2).toString()).toBe('1.5');
  });
  test('power', () => {
    expect(pow(1.2, 3).toString()).toBe('1.728');
  });
});
