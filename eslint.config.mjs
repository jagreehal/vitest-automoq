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
      // Disabled rules to allow our implementation
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
		},
	},
];
