const noInlineFunctionsInLists = require('./rules/no-inline-functions-in-lists');
const noHeavyEffects = require('./rules/no-heavy-effects');
const noUnnecessaryRenders = require('./rules/no-unnecessary-renders');

module.exports = {
  rules: {
    'no-inline-functions-in-lists': noInlineFunctionsInLists,
    'no-heavy-effects': noHeavyEffects,
    'no-unnecessary-renders': noUnnecessaryRenders,
  },
};
