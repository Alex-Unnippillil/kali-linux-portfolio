#!/usr/bin/env node

const { validateServerEnv } = require('../lib/validate.js');

try {
  validateServerEnv(process.env);
  console.log('Environment variables validated successfully.');
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Environment validation failed with an unknown error.');
  }
  process.exit(1);
}
