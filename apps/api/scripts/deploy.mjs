#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist/functions')
const TMP = join(ROOT, '.deploy-tmp')

const functions = process.argv.slice(2)

if (functions.length === 0) {
  console.error('Usage: node scripts/deploy.mjs <domain/operation> [...]')
  console.error('Example: node scripts/deploy.mjs admin/users-list quicklinks/list')
  process.exit(1)
}

if (existsSync(TMP)) rmSync(TMP, { recursive: true })
mkdirSync(TMP, { recursive: true })

let failed = false

for (const fn of functions) {
  const [domain, ...opParts] = fn.split('/')
  const operation = opParts.join('/')

  if (!domain || !operation) {
    console.error(`Invalid format: "${fn}" — expected "domain/operation" e.g. "admin/users-list"`)
    failed = true
    continue
  }

  const functionName = `syllabee-${process.env.ENVIRONMENT ?? 'dev'}-${domain}-${operation}`
  const zipPath = join(TMP, `${domain}-${operation.replaceAll('/', '-')}.zip`)
  const handlerDir = join(DIST, domain, operation)

  if (!existsSync(handlerDir)) {
    console.error(`Handler not found: ${handlerDir}`)
    failed = true
    continue
  }

  console.log(`\nDeploying ${functionName}...`)

  try {
    execSync(`cd ${DIST} && zip -r ${zipPath} ${domain}/${operation} shared`, { stdio: 'inherit' })

    const profile = process.env.AWS_PROFILE ? `--profile ${process.env.AWS_PROFILE}` : ''

    execSync(
      `aws lambda update-function-code \
        --function-name ${functionName} \
        --zip-file fileb://${zipPath} \
        --region ${process.env.AWS_REGION ?? 'us-east-1'} \
        --no-cli-pager \
        ${profile}`,
      { stdio: 'inherit' }
    )

    console.log(`✓ ${functionName} deployed`)
  } catch {
    console.error(`✗ Failed to deploy ${functionName}`)
    failed = true
  }
}

rmSync(TMP, { recursive: true })

if (failed) {
  console.error('\nOne or more deployments failed.')
  process.exit(1)
}

console.log('\nAll deployments complete.')
