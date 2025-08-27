import { Parser } from 'expr-eval';

function parseCoeff(str, defaultValue = 1) {
  if (str === '' || str === '+') return defaultValue;
  if (str === '-' ) return -defaultValue;
  const num = parseFloat(str);
  return isNaN(num) ? defaultValue : num;
}

export function solveLinearEquation(expr) {
  const cleaned = expr.replace(/\s+/g, '').replace('=0', '');
  const match = cleaned.match(/([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)?/);
  if (!match) return { solution: null, steps: ['Unable to parse equation'] };
  const a = parseCoeff(match[1]);
  const b = parseCoeff(match[2] || '0', 0);
  const solution = -b / a;
  const steps = [
    `${a}x + ${b} = 0`,
    `${a}x = ${-b}`,
    `x = ${-b}/${a} = ${solution}`,
  ];
  return { solution, steps };
}

export function solveQuadraticEquation(expr) {
  const cleaned = expr.replace(/\s+/g, '').replace('=0', '');
  const match = cleaned.match(/([+-]?\d*\.?\d*)x\^2([+-]\d*\.?\d*)x([+-]\d*\.?\d*)/);
  if (!match) return { solutions: [], steps: ['Unable to parse equation'] };
  const a = parseCoeff(match[1]);
  const b = parseCoeff(match[2], 0);
  const c = parseCoeff(match[3], 0);
  const disc = b * b - 4 * a * c;
  const sqrtDisc = Math.sqrt(disc);
  const x1 = (-b + sqrtDisc) / (2 * a);
  const x2 = (-b - sqrtDisc) / (2 * a);
  const steps = [
    `${a}x^2 + ${b}x + ${c} = 0`,
    `D = b^2 - 4ac = ${disc}`,
    `x = (-${b} \u00B1 sqrt(D)) / (2*${a})`,
    `x1 = ${x1}`,
    `x2 = ${x2}`,
  ];
  return { solutions: [x1, x2], steps };
}

export function newtonMethod(expr, guess = 1, tol = 1e-7, maxIter = 20) {
  const parser = new Parser();
  const f = parser.parse(expr);
  let x = guess;
  const steps = [`x0 = ${x}`];
  for (let i = 0; i < maxIter; i++) {
    const fx = f.evaluate({ x });
    const derivative = (f.evaluate({ x: x + 1e-6 }) - f.evaluate({ x: x - 1e-6 })) / (2e-6);
    const x1 = x - fx / derivative;
    steps.push(`x${i + 1} = ${x1}`);
    if (Math.abs(x1 - x) < tol) {
      x = x1;
      break;
    }
    x = x1;
  }
  return { root: x, steps };
}

export function solveEquation(expr) {
  const cleaned = expr.replace(/\s+/g, '');
  if (cleaned.includes('x^2')) {
    const { steps } = solveQuadraticEquation(cleaned);
    return steps.join(' | ');
  } else if (cleaned.includes('x')) {
    const { steps } = solveLinearEquation(cleaned);
    return steps.join(' | ');
  } else {
    const { steps } = newtonMethod(cleaned, 1);
    return steps.join(' | ');
  }
}
