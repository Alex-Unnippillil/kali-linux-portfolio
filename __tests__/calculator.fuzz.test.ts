import { performance } from 'perf_hooks';
import seedrandom from 'seedrandom';

import { evaluate } from '../apps/calculator/utils/parser';

const ITERATIONS = 500;
const MAX_AVG_DURATION_MS = 10;

type Rng = ReturnType<typeof seedrandom>;

function randomInt(rng: Rng, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pad(number: number, width: number) {
  return number.toString().padStart(width, '0');
}

function generateLiteral(rng: Rng, { nonZero = false }: { nonZero?: boolean } = {}) {
  let literal = '';
  do {
    const sign = rng() < 0.3 ? '-' : '';
    const integerPart = randomInt(rng, 0, 999);
    const useDecimal = rng() < 0.5;
    const decimalPart = useDecimal ? `.${pad(randomInt(rng, 0, 99), 2)}` : '';
    literal = `${sign}${integerPart}${decimalPart}`;
  } while (nonZero && Math.abs(parseFloat(literal)) < 1e-9);
  return literal;
}

const OPERATORS = ['+', '-', '*', '/'] as const;
const MAX_DEPTH = 3;

function buildOperand(rng: Rng, depth: number, options: { nonZero?: boolean } = {}): string {
  if (options.nonZero) {
    return generateLiteral(rng, { nonZero: true });
  }

  if (depth >= MAX_DEPTH || rng() < 0.5) {
    return generateLiteral(rng);
  }

  // Create nested expressions to exercise parentheses handling.
  return `(${buildExpression(rng, depth + 1)})`;
}

function buildExpression(rng: Rng, depth = 0): string {
  const termCount = randomInt(rng, 2, 4);
  let expression = buildOperand(rng, depth + 1);

  for (let i = 1; i < termCount; i += 1) {
    const operator = OPERATORS[randomInt(rng, 0, OPERATORS.length - 1)];
    const operand = buildOperand(rng, depth + 1, { nonZero: operator === '/' });
    expression += ` ${operator} ${operand}`;
  }

  return expression;
}

describe('calculator evaluate fuzz', () => {
  it('evaluates seeded random expressions without errors and within budget', () => {
    const rng = seedrandom('calculator-fuzz');
    const expressions = Array.from({ length: ITERATIONS }, () => buildExpression(rng));
    const failures: Array<{ expr: string; message: string }> = [];

    localStorage.clear();

    const start = performance.now();
    for (const expr of expressions) {
      try {
        evaluate(expr);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ expr, message });
      }
    }
    const totalDuration = performance.now() - start;
    const averageDuration = totalDuration / expressions.length;

    const diagnostics = [
      `iterations=${expressions.length}`,
      `total=${totalDuration.toFixed(2)}ms`,
      `average=${averageDuration.toFixed(3)}ms`
    ].join(', ');

    if (failures.length > 0) {
      const sample = failures
        .slice(0, 5)
        .map((failure, index) => `${index + 1}. ${failure.expr} -> ${failure.message}`)
        .join('\n');
      throw new Error(
        `Encountered ${failures.length} exception(s) while fuzzing.\n${diagnostics}\nSample failures:\n${sample}`
      );
    }

    if (averageDuration >= MAX_AVG_DURATION_MS) {
      throw new Error(
        `Average evaluation time ${averageDuration.toFixed(3)}ms exceeded ${MAX_AVG_DURATION_MS}ms.\n${diagnostics}`
      );
    }

    expect(failures).toHaveLength(0);
    expect(averageDuration).toBeLessThan(MAX_AVG_DURATION_MS);
  });
});
