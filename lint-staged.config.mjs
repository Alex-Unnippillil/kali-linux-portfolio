const quote = (file) => JSON.stringify(file);

const buildEslintCommand = (files) => {
  const targets = files.map(quote).join(' ');
  return `yarn exec eslint --max-warnings=0 ${targets}`;
};

const buildJestCommand = (files) => {
  const targets = files.map(quote).join(' ');
  return `yarn test --bail --findRelatedTests --passWithNoTests --watchAll=false ${targets}`;
};

const typecheckCommand = () => 'yarn typecheck --pretty false';

export default {
  '*.{js,jsx,ts,tsx}': (files) => [buildEslintCommand(files), buildJestCommand(files)],
  '*.{ts,tsx}': () => typecheckCommand(),
};
