import path from 'node:path'

/**
 * Resolve the fixture directory containing versioned fixture files.
 * Fixtures are intentionally committed to the repository for deterministic tests.
 */
export function getFixturesDir() {
  return path.resolve('tests/fixtures')
}

/**
 * Resolve a specific fixture file path in the repository fixture directory.
 */
export function getFixturePath(fileName) {
  return path.join(getFixturesDir(), fileName)
}
