import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
    },
    resolve: {
        alias: {
            '@syllabee/types': new URL('../../packages/types/index.ts', import.meta.url).pathname,
        },
    },
})
