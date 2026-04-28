import os from 'node:os'
import path from 'node:path'

/**
 * Resolve the fixture directory used by tests and generator script.
 * The default points to OS temporary storage to keep generated files out of Git.
 */
export function getFixturesDir() {
  if (globalThis.process?.env?.IEC61850_FIXTURES_DIR) {
    return path.resolve(globalThis.process.env.IEC61850_FIXTURES_DIR)
  }

  return path.join(os.tmpdir(), 'iec61850toolbox-test-fixtures')
}

/**
 * Resolve a specific fixture file path in the temporary fixture directory.
 */
export function getFixturePath(fileName) {
  return path.join(getFixturesDir(), fileName)
}
