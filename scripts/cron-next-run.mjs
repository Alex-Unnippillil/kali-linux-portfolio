import { CronExpressionParser } from 'cron-parser';
import logger from '../utils/logger';

const expression = process.argv[2];
const count = Number(process.argv[3] ?? 5);

if (!expression) {
  console.error('Usage: node scripts/cron-next-run.mjs "<cron expression>" [count]');
  process.exit(1);
}

const interval = CronExpressionParser.parse(expression);
for (let i = 0; i < count; i++) {
  logger.info(interval.next().toString());
}

