import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}**'
        ],
    },
    resolve: {
        alias: {
            '@syllabee/types': path.resolve(__dirname, '../../packages/types/index.ts'),
        },
    },
})
