/** @type {import('eslint').Linter.Config} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: {
        // Use the parser provided by the plugin
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      // Using string names prevents errors when packages are missing
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // Basic rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      
      // Disabled rules to allow our implementation
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    }
  }
];
