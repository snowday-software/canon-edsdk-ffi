import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/real-camera/**/*.test.ts'],
        fileParallelism: false,
        testTimeout: 120000,
    },
});
