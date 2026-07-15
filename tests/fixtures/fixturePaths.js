import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Resolve the fixture directory containing versioned fixture files.
 * Fixtures are intentionally committed to the repository for deterministic tests.
 */
export function getFixturesDir() {
  return fixturesDir
}

/**
 * Resolve a specific fixture file path in the repository fixture directory.
 */
export function getFixturePath(fileName) {
  return path.join(getFixturesDir(), fileName)
}
