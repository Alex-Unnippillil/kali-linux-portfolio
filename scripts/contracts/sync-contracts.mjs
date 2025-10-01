#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');

const stubContracts = {
  contact: {
    version: '1.0.0',
    notes:
      'Contract verified against the /api/contact stub when reCAPTCHA is disabled in local development.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/contact',
        description: 'Fetches a CSRF token. In environments without RECAPTCHA it returns a disabled payload.',
        mock: { status: 503, body: { ok: false, code: 'recaptcha_disabled' } },
        runtimeTest: {
          enabled: true,
          mode: 'mock',
          expectedStatus: 503,
          responseSchema: {
            type: 'object',
            required: ['ok', 'code'],
            properties: {
              ok: { const: false },
              code: { enum: ['recaptcha_disabled', 'recaptcha_error'] },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
  hydra: {
    version: '1.0.0',
    notes: 'The Hydra simulation returns 501 when FEATURE_TOOL_APIS is disabled.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/hydra',
        description: 'Triggers the Hydra password auditing simulation.',
        mock: { status: 501, body: { error: 'Not implemented' } },
        runtimeTest: {
          enabled: true,
          mode: 'mock',
          expectedStatus: 501,
          responseSchema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
  john: {
    version: '1.0.0',
    notes: 'John the Ripper stub short-circuits with 501 unless FEATURE_TOOL_APIS is enabled.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/john',
        description: 'Submits a hash for cracking.',
        mock: { status: 501, body: { error: 'Not implemented' } },
        runtimeTest: {
          enabled: true,
          mode: 'mock',
          expectedStatus: 501,
          responseSchema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
  metasploit: {
    version: '1.0.0',
    notes: 'Metasploit simulation requires FEATURE_TOOL_APIS to be enabled.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/metasploit',
        description: 'Executes a command within the Metasploit simulation.',
        mock: { status: 501, body: { error: 'Not implemented' } },
        runtimeTest: {
          enabled: true,
          expectedStatus: 501,
          responseSchema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
  mimikatz: {
    version: '1.0.0',
    notes: 'Mimikatz simulation requires FEATURE_TOOL_APIS to be enabled.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/mimikatz',
        description: 'Lists available Mimikatz modules or executes a command.',
        mock: { status: 501, body: { error: 'Not implemented' } },
        runtimeTest: {
          enabled: true,
          expectedStatus: 501,
          responseSchema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
  radare2: {
    version: '1.0.0',
    notes: 'Radare2 simulation requires FEATURE_TOOL_APIS to be enabled.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/radare2',
        description: 'Runs Radare2 analysis utilities.',
        mock: { status: 501, body: { error: 'Not implemented' } },
        runtimeTest: {
          enabled: true,
          expectedStatus: 501,
          responseSchema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    ],
  },
};

const ensureDir = async (dir) => fs.mkdir(dir, { recursive: true });

const toTitleCase = (slug) =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const hasEntryPoint = async (dir) => {
  const entries = await fs.readdir(dir);
  return entries.some((entry) => /^index\.(t|j)sx?$/.test(entry));
};

const writeIfMissing = async (file, data) => {
  try {
    await fs.access(file);
    return false;
  } catch {
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return true;
  }
};

const createUiSchema = (appId, title) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `urn:unnippillil:app:${appId}:ui`,
  title: `${title} UI contract`,
  description: `UI surface contract for the ${title} application.`,
  allOf: [
    { $ref: 'urn:unnippillil:contract:ui' },
    {
      type: 'object',
      properties: {
        appId: { const: appId },
      },
      required: ['appId'],
    },
  ],
});

const createUiFixture = (appId, title) => ({
  appId,
  title,
  version: '1.0.0',
  status: 'ok',
  description: `${title} base UI contract. Update panels and metadata when the UI changes.`,
  panels: [
    {
      id: 'main',
      type: 'static',
      description: 'Default panel placeholder. Replace with app-specific sections.',
      content: {
        headline: `${title} preview`,
        body: 'Document expected widgets, metrics, and interactive regions for this app.',
      },
    },
  ],
  metadata: {
    contractOwner: 'ui-team',
    changelog: [],
  },
});

const createServiceSchema = (appId, title) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `urn:unnippillil:app:${appId}:service`,
  title: `${title} service contract`,
  description: `Service interactions for the ${title} application.`,
  allOf: [
    { $ref: 'urn:unnippillil:contract:service' },
    {
      type: 'object',
      properties: {
        appId: { const: appId },
      },
      required: ['appId'],
    },
  ],
});

const createServiceFixture = (appId, title) => ({
  appId,
  version: '1.0.0',
  notes: `${title} does not define remote calls. Extend this contract when the app integrates with APIs.`,
  endpoints: [],
});

(async () => {
  const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
  let created = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const appDir = path.join(APPS_DIR, entry.name);
    if (!(await hasEntryPoint(appDir))) continue;
    const appId = entry.name;
    const title = toTitleCase(appId) || appId;
    const contractsDir = path.join(appDir, '__contracts__');
    await ensureDir(contractsDir);

    const uiSchemaPath = path.join(contractsDir, 'ui.schema.json');
    const uiFixturePath = path.join(contractsDir, 'ui.fixture.json');
    const serviceSchemaPath = path.join(contractsDir, 'service.schema.json');
    const serviceFixturePath = path.join(contractsDir, 'service.fixture.json');

    if (await writeIfMissing(uiSchemaPath, createUiSchema(appId, title))) {
      created += 1;
    }
    if (await writeIfMissing(uiFixturePath, createUiFixture(appId, title))) {
      created += 1;
    }
    if (await writeIfMissing(serviceSchemaPath, createServiceSchema(appId, title))) {
      created += 1;
    }

    if (!(await fs
      .access(serviceFixturePath)
      .then(() => true)
      .catch(() => false))) {
      const preset = stubContracts[appId];
      const serviceFixture = preset
        ? { appId, ...preset }
        : createServiceFixture(appId, title);
      await fs.writeFile(
        serviceFixturePath,
        `${JSON.stringify(serviceFixture, null, 2)}\n`,
        'utf8',
      );
      created += 1;
    }
  }

  console.log(`Contract sync complete. ${created} files created.`);
})();
