#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const FUNNEL_STEPS = [
  'view_contact_entry',
  'form_started',
  'submission_success',
];

const inputArg = process.argv[2];
const inputPath = inputArg
  ? path.resolve(process.cwd(), inputArg)
  : path.resolve(process.cwd(), 'data/contact-funnel-events.ndjson');

const readFileSafely = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const parseEvents = (raw) => {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Failed to parse line ${index + 1}: ${error.message}`);
      }
    });
};

const parseLabel = (label) => {
  if (!label) return {};
  return label.split(';').reduce((acc, pair) => {
    const [key, value] = pair.split('=');
    if (key) {
      acc[key.trim()] = (value ?? '').trim();
    }
    return acc;
  }, {});
};

const increment = (map, key) => {
  const current = map.get(key) ?? 0;
  map.set(key, current + 1);
};

const main = async () => {
  const raw = await readFileSafely(inputPath);
  if (raw === null) {
    console.error(
      `No analytics export found at ${inputPath}. Pass a file path or export your contact funnel events as NDJSON.`,
    );
    process.exit(1);
  }

  const events = parseEvents(raw).filter(
    (event) => event && event.category === 'contact_funnel',
  );

  if (!events.length) {
    console.log('No contact funnel events found in the supplied data.');
    return;
  }

  const sessionsByStep = new Map(FUNNEL_STEPS.map((step) => [step, new Set()]));
  const failureReasons = new Map();
  const validationIssues = new Map();
  const fallbackReasons = new Map();
  const attachmentIssues = new Map();
  const ctaUsage = new Map();

  for (const event of events) {
    const labelData = parseLabel(event.label);
    const sessionId = labelData.sid || event.session || labelData.session;
    if (!sessionId) continue;

    switch (event.action) {
      case 'validation_error':
        increment(validationIssues, labelData.field || 'unknown');
        break;
      case 'submission_failure':
        increment(failureReasons, labelData.reason || 'unspecified');
        break;
      case 'fallback_presented':
        increment(fallbackReasons, labelData.reason || 'unspecified');
        break;
      case 'attachment_rejected':
        increment(attachmentIssues, labelData.reason || 'unspecified');
        break;
      case 'cta_copy_email':
      case 'cta_open_mail_client':
      case 'cta_copy_message':
        increment(ctaUsage, event.action);
        break;
      default:
        break;
    }

    if (FUNNEL_STEPS.includes(event.action)) {
      sessionsByStep.get(event.action)?.add(sessionId);
    }
  }

  const summary = FUNNEL_STEPS.map((step, index) => {
    const stepSessions = sessionsByStep.get(step)?.size ?? 0;
    const previousSessions =
      index === 0 ? stepSessions : sessionsByStep.get(FUNNEL_STEPS[index - 1])?.size ?? 0;
    const conversion =
      index === 0 || previousSessions === 0
        ? 1
        : Number((stepSessions / previousSessions).toFixed(3));
    return {
      step,
      sessions: stepSessions,
      conversion,
    };
  });

  const totalEntrants = summary[0]?.sessions ?? 0;
  const successful = summary[summary.length - 1]?.sessions ?? 0;

  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

  console.log('Contact funnel summary');
  console.log('=======================\n');
  console.log(`Total sessions observed: ${totalEntrants}`);
  console.log(`Successful submissions: ${successful}`);
  console.log(`Overall conversion: ${
    totalEntrants ? formatPercent(successful / totalEntrants) : '0.0%'
  }\n`);

  console.log('Step-by-step conversion');
  for (const item of summary) {
    const percent = formatPercent(item.conversion);
    console.log(`• ${item.step}: ${item.sessions} sessions (${percent} from previous step)`);
  }

  const printBreakdown = (title, dataMap) => {
    if (!dataMap.size) return;
    console.log(`\n${title}`);
    for (const [key, count] of dataMap.entries()) {
      const share = totalEntrants ? formatPercent(count / totalEntrants) : '0.0%';
      console.log(`• ${key}: ${count} (${share} of entrants)`);
    }
  };

  printBreakdown('Validation issues', validationIssues);
  printBreakdown('Submission failure reasons', failureReasons);
  printBreakdown('Fallback triggers', fallbackReasons);
  printBreakdown('Attachment problems', attachmentIssues);

  if (ctaUsage.size) {
    console.log('\nCall-to-action usage');
    for (const [key, count] of ctaUsage.entries()) {
      console.log(`• ${key}: ${count}`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
