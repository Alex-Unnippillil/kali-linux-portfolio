import Decimal from 'decimal.js';

export const decimal = (value: Decimal.Value) => new Decimal(value);
export const add = (a: Decimal.Value, b: Decimal.Value) => new Decimal(a).add(b);
export const subtract = (a: Decimal.Value, b: Decimal.Value) => new Decimal(a).sub(b);
export const multiply = (a: Decimal.Value, b: Decimal.Value) => new Decimal(a).mul(b);
export const divide = (a: Decimal.Value, b: Decimal.Value) => new Decimal(a).div(b);
export const pow = (a: Decimal.Value, b: Decimal.Value) => new Decimal(a).pow(b);
export const toNumber = (value: Decimal.Value) => new Decimal(value).toNumber();
