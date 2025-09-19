export default [
  {
    files: ['**/*.js'],
    ignores: ['turbo.json'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  }
];
