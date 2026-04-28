import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSCL } from '../src/lib/parseSCL.js'

function loadFixture(fileName) {
  return readFileSync(path.resolve('tests/fixtures', fileName), 'utf-8')
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
