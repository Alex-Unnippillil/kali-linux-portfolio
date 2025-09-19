import 'jest';

declare global {
  // Helpers that mark suites/tests as flaky so they can be quarantined.
  var testFlaky: typeof test;
  var itFlaky: typeof it;
  var describeFlaky: typeof describe;
}

export {};
