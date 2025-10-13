import { CronExpressionParser } from 'cron-parser';

/**
 * Calculate the next run times for a cron expression.
 * @param expression - Cron-style expression (e.g. "*\/5 * * * *").
 * @param count - Number of run times to generate.
 * @param options - Optional cron-parser options such as currentDate.
 */
export function getNextRunTimes(
  expression: string,
  count = 5,
  options: any = {},
): Date[] {
  const interval = (CronExpressionParser as any).parse(expression, options);
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    result.push(interval.next().toDate());
  }
  return result;
}

