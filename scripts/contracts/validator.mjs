import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Ajv2020 from 'ajv/dist/2020.js';
import fg from 'fast-glob';
import { createRequest, createResponse } from 'node-mocks-http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const schemaExts = ['.ts', '.js', '.mjs', '.cjs', '.tsx', '.jsx'];

const readJson = async (absPath) => {
  const data = await fs.readFile(absPath, 'utf8');
  return JSON.parse(data);
};

const pathExists = async (absPath) => {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
};

const findApiFile = async (apiPath) => {
  const trimmed = apiPath.replace(/^\/?api\/?/, '');
  const segments = trimmed.split('/').filter(Boolean);
  const base = path.join(ROOT_DIR, 'pages', 'api', ...segments);
  for (const ext of schemaExts) {
    const candidate = base + ext;
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
};

const createAjv = () =>
  new Ajv2020({
    strict: false,
    allErrors: true,
    allowUnionTypes: true,
  });

const formatErrors = (errors = []) =>
  errors
    .map((err) => {
      const instancePath = err.instancePath || err.dataPath || '';
      return `${instancePath} ${err.message}`.trim();
    })
    .join('; ');

export async function validateContracts({ runRuntimeTests = true, logger = console } = {}) {
  const ajv = createAjv();
  const errors = [];
  const baseSchemas = await fg('contracts/schemas/*.schema.json', { cwd: ROOT_DIR });
  for (const schemaPath of baseSchemas) {
    const abs = path.join(ROOT_DIR, schemaPath);
    const schema = await readJson(abs);
    ajv.addSchema(schema);
  }

  const contractDirs = await fg('apps/*/__contracts__', {
    cwd: ROOT_DIR,
    onlyDirectories: true,
    deep: 2,
  });

  for (const dir of contractDirs.sort()) {
    const absDir = path.join(ROOT_DIR, dir);
    const appId = path.basename(path.dirname(absDir));
    const uiSchemaPath = path.join(absDir, 'ui.schema.json');
    const uiFixturePath = path.join(absDir, 'ui.fixture.json');
    const serviceSchemaPath = path.join(absDir, 'service.schema.json');
    const serviceFixturePath = path.join(absDir, 'service.fixture.json');

    if (!(await pathExists(uiSchemaPath))) {
      errors.push({ appId, type: 'ui', message: 'Missing ui.schema.json' });
      continue;
    }
    if (!(await pathExists(uiFixturePath))) {
      errors.push({ appId, type: 'ui', message: 'Missing ui.fixture.json' });
      continue;
    }
    if (!(await pathExists(serviceSchemaPath))) {
      errors.push({ appId, type: 'service', message: 'Missing service.schema.json' });
      continue;
    }
    if (!(await pathExists(serviceFixturePath))) {
      errors.push({ appId, type: 'service', message: 'Missing service.fixture.json' });
      continue;
    }

    let uiSchema;
    let serviceSchema;
    try {
      uiSchema = await readJson(uiSchemaPath);
    } catch (error) {
      errors.push({ appId, type: 'ui', message: `Invalid ui.schema.json: ${error.message}` });
      continue;
    }
    try {
      serviceSchema = await readJson(serviceSchemaPath);
    } catch (error) {
      errors.push({ appId, type: 'service', message: `Invalid service.schema.json: ${error.message}` });
      continue;
    }

    let validateUi;
    let validateService;
    try {
      validateUi = ajv.compile(uiSchema);
    } catch (error) {
      errors.push({ appId, type: 'ui', message: `Schema compile error: ${error.message}` });
      continue;
    }
    try {
      validateService = ajv.compile(serviceSchema);
    } catch (error) {
      errors.push({ appId, type: 'service', message: `Schema compile error: ${error.message}` });
      continue;
    }

    try {
      const uiFixture = await readJson(uiFixturePath);
      if (!validateUi(uiFixture)) {
        errors.push({
          appId,
          type: 'ui',
          message: `Fixture failed validation: ${formatErrors(validateUi.errors)}`,
        });
      }
    } catch (error) {
      errors.push({ appId, type: 'ui', message: `Invalid ui.fixture.json: ${error.message}` });
    }

    let serviceFixture;
    try {
      serviceFixture = await readJson(serviceFixturePath);
      if (!validateService(serviceFixture)) {
        errors.push({
          appId,
          type: 'service',
          message: `Fixture failed validation: ${formatErrors(validateService.errors)}`,
        });
      }
    } catch (error) {
      errors.push({
        appId,
        type: 'service',
        message: `Invalid service.fixture.json: ${error.message}`,
      });
      continue;
    }

    if (runRuntimeTests && serviceFixture?.endpoints?.length) {
      for (const endpoint of serviceFixture.endpoints) {
        const testConfig = endpoint.runtimeTest;
        if (!testConfig?.enabled) continue;

        if (typeof testConfig.expectedStatus !== 'number') {
          errors.push({
            appId,
            type: 'service',
            message: `Endpoint ${endpoint.method} ${endpoint.path} missing expectedStatus`,
          });
          continue;
        }

        const mode = testConfig.mode ?? 'handler';
        if (mode === 'mock') {
          if (!endpoint.mock) {
            errors.push({
              appId,
              type: 'service',
              message: `Endpoint ${endpoint.method} ${endpoint.path} mock mode requires a mock payload`,
            });
            continue;
          }
          if (endpoint.mock.status !== testConfig.expectedStatus) {
            errors.push({
              appId,
              type: 'service',
              message: `Endpoint ${endpoint.method} ${endpoint.path} mock status ${endpoint.mock.status} does not match expected ${testConfig.expectedStatus}`,
            });
          }
          if (testConfig.responseSchema) {
            const responseValidator = createAjv().compile(testConfig.responseSchema);
            if (!responseValidator(endpoint.mock.body)) {
              errors.push({
                appId,
                type: 'service',
                message: `Endpoint ${endpoint.method} ${endpoint.path} mock body failed validation: ${formatErrors(responseValidator.errors)}`,
              });
            }
          }
          continue;
        }

        const apiFile = await findApiFile(endpoint.path);
        if (!apiFile) {
          errors.push({
            appId,
            type: 'service',
            message: `Endpoint ${endpoint.method} ${endpoint.path} has no matching API handler`,
          });
          continue;
        }

        try {
          const mod = await import(pathToFileURL(apiFile).href);
          const handler = mod.default ?? mod.handler;
          if (typeof handler !== 'function') {
            errors.push({
              appId,
              type: 'service',
              message: `Endpoint ${endpoint.method} ${endpoint.path} missing handler export`,
            });
            continue;
          }

          const requestOptions = {
            method: endpoint.method,
            url: endpoint.path,
            headers: testConfig.request?.headers,
            body: testConfig.request?.body,
            query: testConfig.request?.query,
          };
          const req = createRequest(requestOptions);
          if (testConfig.request?.cookies) {
            req.cookies = testConfig.request.cookies;
          }
          const res = createResponse();

          await handler(req, res);

          const status = res._getStatusCode();
          if (status !== testConfig.expectedStatus) {
            errors.push({
              appId,
              type: 'service',
              message: `Endpoint ${endpoint.method} ${endpoint.path} expected status ${testConfig.expectedStatus} but received ${status}`,
            });
            continue;
          }

          if (testConfig.responseSchema) {
            const responseValidator = createAjv().compile(testConfig.responseSchema);
            const data = res._isJSON() ? res._getJSONData() : res._getData();
            if (!responseValidator(data)) {
              errors.push({
                appId,
                type: 'service',
                message: `Endpoint ${endpoint.method} ${endpoint.path} response failed validation: ${formatErrors(responseValidator.errors)}`,
              });
            }
          }
        } catch (error) {
          errors.push({
            appId,
            type: 'service',
            message: `Endpoint ${endpoint.method} ${endpoint.path} runtime test failed: ${error.message}`,
          });
        }
      }
    }
  }

  if (!errors.length && logger) {
    logger.log('All contracts validated successfully.');
  }

  return { valid: errors.length === 0, errors };
}
