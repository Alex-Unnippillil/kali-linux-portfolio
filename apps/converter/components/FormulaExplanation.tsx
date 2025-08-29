import { convertUnit } from '../../../components/apps/converter/unitData';

interface FormulaProps {
  category: string;
  from: string;
  to: string;
  input: number;
  output: number;
  precision: number;
  sigFig: boolean;
}

const formatNumber = (num: number, precision: number, sigFig: boolean) =>
  sigFig ? Number(num).toPrecision(precision) : Number(num).toFixed(precision);

export default function FormulaExplanation({
  category,
  from,
  to,
  input,
  output,
  precision,
  sigFig,
}: FormulaProps) {
  const zero = convertUnit(category as any, from as any, to as any, 0);
  const one = convertUnit(category as any, from as any, to as any, 1);
  const slope = one - zero;
  const intercept = zero;
  const general =
    intercept === 0
      ? `${to} = ${from} × ${slope}`
      : `${to} = ${from} × ${slope} + ${intercept}`;
  const withValues =
    intercept === 0
      ? `${formatNumber(output, precision, sigFig)} = ${formatNumber(
          input,
          precision,
          sigFig,
        )} × ${slope}`
      : `${formatNumber(output, precision, sigFig)} = ${formatNumber(
          input,
          precision,
          sigFig,
        )} × ${slope} + ${intercept}`;

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-lg">Formula</summary>
      <div className="mt-2 text-sm space-y-1">
        <div>{general}</div>
        <div>{withValues}</div>
      </div>
    </details>
  );
}

