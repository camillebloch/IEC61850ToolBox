import { execFileSync } from 'node:child_process'

/**
 * Generate XML fixtures once per test process.
 * This keeps BDD specs deterministic in IDE runs and CI.
 */
export function ensureFixturesGenerated() {
  if (globalThis.__iec61850FixturesReady) {
    return
  }

  execFileSync('node', ['tests/fixtures/generate-fixtures.mjs'], {
    stdio: 'inherit',
  })

  globalThis.__iec61850FixturesReady = true
}
