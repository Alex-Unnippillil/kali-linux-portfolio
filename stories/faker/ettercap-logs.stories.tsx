import React from 'react';
import LogPane, { LogEntry } from '../../apps/ettercap/components/LogPane';
import {
  createLogGenerator,
  DEFAULT_LOG_SEED,
  formatLogEntry,
} from '@/utils/faker/logs';

const generator = createLogGenerator({ seed: DEFAULT_LOG_SEED });
const logs: LogEntry[] = Array.from({ length: 8 }, () => generator()).map((entry) => ({
  id: entry.id,
  level: entry.level,
  message: formatLogEntry(entry),
}));

const meta = {
  title: 'Faker/Ettercap/LogPane',
  component: LogPane,
};

export default meta;

export const Default = () => <LogPane logs={logs} />;
