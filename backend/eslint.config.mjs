import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Karen Home — workspace ESLint flat config.
 *
 * Scope decision (ADR-0010/G3): lint covers first-party source only
 * (packages db and contracts src, apps api src and test). Build output (dist), node_modules
 * and database SQL artifacts are out of scope for static JS linting.
 *
 * Rule posture for Gate 3-DB: correctness-focused recommended rulesets are ON;
 * stylistic rules are intentionally OFF so that lint enforces real defects
 * (unused vars, unsafe any, float drop, etc.) without churning frozen code.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.js', '**/*.config.mjs', 'docs/**', 'database/**', 'scripts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['apps/api/test/*.ts', 'apps/api/test/integration/*.ts', 'apps/api/test/g4-*.spec.ts'],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 32,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-async-promise-executor': 'error',
      'require-atomic-updates': 'error',
    },
  },
  {
    files: ['apps/api/test/**/*.ts'],
    rules: {
      // Test doubles intentionally use `as any`; production code forbids it.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

);
