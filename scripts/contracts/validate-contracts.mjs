#!/usr/bin/env node
import process from 'process';
import { validateContracts } from './validator.mjs';

(async () => {
  const result = await validateContracts({ logger: console });
  if (!result.valid) {
    console.error('Contract validation failed');
    for (const error of result.errors) {
      console.error(`- [${error.appId}] (${error.type}) ${error.message}`);
    }
    process.exitCode = 1;
  }
})();
