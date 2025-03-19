// Import packages with fallbacks to handle both ESLint v8 and v9
let eslint, tseslint, eslintPluginUnicorn, eslintConfigPrettier;

try {
  // Try ESLint v9 style imports
  eslint = await import('@eslint/js');
  eslintConfigPrettier = await import('eslint-config-prettier');
  eslintPluginUnicorn = await import('eslint-plugin-unicorn');
  tseslint = await import('typescript-eslint');
} catch {
  // Fallback for ESLint v8
  console.warn('Using ESLint v8 compatibility mode');
  eslint = { configs: { recommended: { rules: {} } } };
  eslintConfigPrettier = {};
  eslintPluginUnicorn = { configs: { recommended: { rules: {} } } };
  
  // Use @typescript-eslint plugins directly if typescript-eslint package is not available
  try {
    const parser = await import('@typescript-eslint/parser');
    const plugin = await import('@typescript-eslint/eslint-plugin');
    tseslint = { 
      config: (...args) => args,
      configs: { 
        recommended: { 
          parser: '@typescript-eslint/parser',
          plugins: ['@typescript-eslint'], 
          rules: plugin.default.configs.recommended.rules 
        } 
      } 
    };
  } catch {
    tseslint = { 
      config: (...args) => args,
      configs: { recommended: {} } 
    };
  }
}

// Create config based on available packages
const config = tseslint.config ? 
  tseslint.config(
    {
      ignores: ['dist/**'],
    },
    eslint.configs?.recommended,
    ...tseslint.configs?.recommended,
    eslintConfigPrettier,
    eslintPluginUnicorn.configs?.recommended,
    {
      rules: {
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/consistent-function-scoping': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/prefer-as-const': 'off',
        'unicorn/prefer-spread': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
      },
    }
  ) :
  // Fallback for older ESLint versions
  {
    ignores: ['dist/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    }
  };

export default config;
