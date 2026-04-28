import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSCL } from '../src/lib/parseSCL.js'
import { getFixturePath, getFixturesDir } from './fixtures/fixturePaths.js'

function loadFixture(fileName) {
  const fixturePath = getFixturePath(fileName)

  // Provide a clear guidance message if fixtures were not generated before tests.
  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}. Run "npm run test:fixtures" first.`)
  }

  return readFileSync(fixturePath, 'utf-8')
}

test('parseSCL parses a valid SSD and extracts expected normalized data', () => {
  const parsed = parseSCL(loadFixture('spec.ssd'))

  assert.deepEqual(parsed.header, { id: 'spec-header', version: '1', revision: '1' })
  assert.equal(parsed.ieds.length, 1)
  assert.equal(parsed.ieds[0].name, 'IED_SPEC')
  assert.equal(parsed.ieds[0].logicalDevices.length, 1)

  const ld = parsed.ieds[0].logicalDevices[0]
  assert.equal(ld.inst, 'LD0')
  assert.equal(ld.logicalNodes.length, 2)
  assert.equal(ld.datasets[0].name, 'DS_MEAS')
  assert.equal(ld.reportControls[0].name, 'RCB1')
  assert.equal(ld.gseControls[0].name, 'GCB1')
})

test('parseSCL throws a clear error when XML has no SCL root element', () => {
  assert.throws(
    () => parseSCL('<Root/>'),
    /Fichier SCL invalide : élément racine <SCL> introuvable/
  )
})

test('fixtures are generated in the temporary fixture directory', () => {
  const fixturePath = getFixturePath('spec.ssd')
  assert.equal(fixturePath.startsWith(getFixturesDir()), true)
})
