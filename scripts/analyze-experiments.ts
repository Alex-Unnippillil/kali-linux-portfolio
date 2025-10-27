#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import path from 'path';

import { experiments } from '../lib/experiments';

type MetricRow = {
  experiment: string;
  variant: string;
  metric: string;
  conversions: number;
  total: number;
};

type MetricSummary = {
  variant: string;
  conversions: number;
  total: number;
  mean: number;
  variance: number;
};

const parseCsv = (filePath: string): MetricRow[] => {
  const resolved = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(resolved, 'utf-8');
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((value) => value.trim());

  const columnIndex = (name: string) => headers.indexOf(name);

  const requiredColumns = ['experiment', 'variant', 'metric', 'conversions', 'total'];
  for (const column of requiredColumns) {
    if (columnIndex(column) === -1) {
      throw new Error(`Missing required column "${column}" in ${filePath}`);
    }
  }

  return lines.map((line) => {
    const parts = line.split(',').map((value) => value.trim());
    return {
      experiment: parts[columnIndex('experiment')],
      variant: parts[columnIndex('variant')],
      metric: parts[columnIndex('metric')],
      conversions: Number(parts[columnIndex('conversions')]),
      total: Number(parts[columnIndex('total')]),
    };
  });
};

const toPosteriorMean = (conversions: number, total: number): number => {
  return (conversions + 1) / (total + 2);
};

const toPosteriorVariance = (mean: number, total: number): number => {
  return (mean * (1 - mean)) / (total + 3);
};

const normalCdf = (x: number): number => {
  return 0.5 * (1 + Math.erf(x / Math.SQRT2));
};

const summariseRow = (row: MetricRow): MetricSummary => {
  const mean = toPosteriorMean(row.conversions, row.total);
  const variance = toPosteriorVariance(mean, row.total);
  return {
    variant: row.variant,
    conversions: row.conversions,
    total: row.total,
    mean,
    variance,
  };
};

const compareAgainstControl = (control: MetricSummary, challenger: MetricSummary) => {
  const difference = challenger.mean - control.mean;
  const standardDeviation = Math.sqrt(control.variance + challenger.variance);
  const zScore = difference / standardDeviation;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

  return {
    variant: challenger.variant,
    difference,
    zScore,
    pValue,
  };
};

const run = (): void => {
  const [, , inputFile] = process.argv;

  if (!inputFile) {
    console.error('Usage: ts-node scripts/analyze-experiments.ts metrics.csv');
    process.exit(1);
  }

  const rows = parseCsv(inputFile);
  const grouped = new Map<string, MetricRow[]>();

  for (const row of rows) {
    const experiment = experiments[row.experiment];
    if (!experiment) {
      console.warn(`Skipping unknown experiment "${row.experiment}"`);
      continue;
    }

    const variants = experiment.variants.map((variant) => variant.id);
    if (!variants.includes(row.variant)) {
      console.warn(`Skipping unknown variant "${row.variant}" for experiment "${row.experiment}"`);
      continue;
    }

    const key = `${row.experiment}:${row.metric}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  for (const [key, list] of grouped.entries()) {
    const [experimentId, metricId] = key.split(':');
    const experiment = experiments[experimentId];
    const controlId = experiment.variants[0].id;

    const summaries = list.map(summariseRow);
    const control = summaries.find((summary) => summary.variant === controlId);

    if (!control) {
      console.warn(`No control data found for ${experimentId} ${metricId}`);
      continue;
    }

    console.log(`\nExperiment: ${experiment.name} (${experimentId})`);
    console.log(`Metric: ${metricId}`);
    console.table(
      summaries.map(({ variant, conversions, total, mean }) => ({
        variant,
        conversions,
        total,
        rate: mean.toFixed(4),
      })),
    );

    for (const summary of summaries) {
      if (summary.variant === controlId) {
        continue;
      }
      const comparison = compareAgainstControl(control, summary);
      console.log(
        `  • ${summary.variant} vs ${controlId}: Δ=${comparison.difference.toFixed(4)} z=${comparison.zScore.toFixed(2)} p=${comparison.pValue.toFixed(4)}`,
      );
    }
  }
};

run();
