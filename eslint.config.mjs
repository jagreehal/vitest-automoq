import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**'],
  },
  {
    plugins: {
      unicorn: eslintPluginUnicorn,
      '@typescript-eslint': tseslint,
      eslint: eslint,
      eslintConfigPrettier: eslintConfigPrettier,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Required for function parameters in mock types
      '@typescript-eslint/consistent-type-assertions': 'off', // Required for mock type assertions
    },
  },
];
