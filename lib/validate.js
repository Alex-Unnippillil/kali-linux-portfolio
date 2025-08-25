'use strict';
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, 'default', { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, '__esModule', { value: true }), mod);
var validate_exports = {};
__export(validate_exports, {
  validateEnv: () => validateEnv,
  validatePublicEnv: () => validatePublicEnv,
  validateRequest: () => validateRequest,
});
module.exports = __toCommonJS(validate_exports);
var import_zod = require('zod');
var import_crypto = __toESM(require('crypto'));
function validateRequest(
  req,
  res,
  { querySchema, bodySchema, queryLimit = 1024, bodyLimit = 16 * 1024 }
) {
  const queryData = req.query ?? {};
  const queryString = JSON.stringify(queryData);
  if (queryString.length > queryLimit) {
    const hash = import_crypto.default
      .createHash('sha256')
      .update(queryString)
      .digest('hex');
    console.warn('Oversized query', hash);
    res.status(400).json({ error: 'Invalid input' });
    return null;
  }
  let parsedQuery = queryData;
  if (querySchema) {
    const result = querySchema.safeParse(queryData);
    if (!result.success) {
      const hash = import_crypto.default
        .createHash('sha256')
        .update(queryString)
        .digest('hex');
      console.warn('Invalid query', hash);
      res.status(400).json({ error: 'Invalid input' });
      return null;
    }
    parsedQuery = result.data;
  }
  const bodyData = req.body ?? {};
  const bodyString = JSON.stringify(bodyData);
  if (bodyString.length > bodyLimit) {
    const hash = import_crypto.default
      .createHash('sha256')
      .update(bodyString)
      .digest('hex');
    console.warn('Oversized body', hash);
    res.status(400).json({ error: 'Invalid input' });
    return null;
  }
  let parsedBody = bodyData;
  if (bodySchema) {
    const result = bodySchema.safeParse(bodyData);
    if (!result.success) {
      const hash = import_crypto.default
        .createHash('sha256')
        .update(bodyString)
        .digest('hex');
      console.warn('Invalid body', hash);
      res.status(400).json({ error: 'Invalid input' });
      return null;
    }
    parsedBody = result.data;
  }
  return { query: parsedQuery, body: parsedBody };
}
const EnvSchema = import_zod.z.object({});
const PublicEnvSchema = import_zod.z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: import_zod.z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_TRACKING_ID: import_zod.z.string().optional(),
});
function validateEnv(env) {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    if (env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing}`);
    }
    console.warn(`Missing required environment variables: ${missing}`);
    return {};
  }
  return result.data;
}
function validatePublicEnv(env) {
  const result = PublicEnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    if (env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing}`);
    }
    console.warn(`Missing required environment variables: ${missing}`);
    return {};
  }
  return result.data;
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    validateEnv,
    validatePublicEnv,
    validateRequest,
  });
