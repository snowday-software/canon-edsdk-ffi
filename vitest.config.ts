import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: ['test/real-camera/**', '**/node_modules/**', '**/dist/**'],
    },
});
