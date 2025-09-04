import Decimal from 'decimal.js';

export const add = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).add(b);
export const subtract = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).sub(b);
export const multiply = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).mul(b);
export const divide = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).div(b);
export const pow = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).pow(b);

export default Decimal;
