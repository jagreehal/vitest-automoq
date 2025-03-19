import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2024',
  // Disable TypeScript declarations due to type compatibility issues with Vitest's mock types
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  noExternal: ['vitest'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
