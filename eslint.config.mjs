import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        rules: {
            curly: 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty-function': 'off',
            '@typescript-eslint/no-empty-function': 'warn',
            'no-useless-escape': 'warn',
            'no-empty': 'warn',
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-fallthrough': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/consistent-type-imports': 'warn',
            'no-console': 'off',
        },
    },
    {
        files: ['src/index.ts'],
        rules: {
            '@typescript-eslint/no-namespace': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'vendor/**', 'test/**', 'examples/**', '*.config.*', '*.cjs'],
    },
);
