import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['packages/*/src/**/*.test.ts'],
        environment: 'node',
    },
});
//# sourceMappingURL=vitest.config.js.map