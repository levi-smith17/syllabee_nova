import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
    },
    resolve: {
        alias: {
            '@syllabee/types': path.resolve(__dirname, '../../packages/types/index.ts'),
        },
    },
})
