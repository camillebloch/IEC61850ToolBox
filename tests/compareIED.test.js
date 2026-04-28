import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSCL } from '../src/lib/parseSCL.js'
import { compareIED } from '../src/lib/compareIED.js'

function loadFixture(fileName) {
  return readFileSync(path.resolve('tests/fixtures', fileName), 'utf-8')
}

/**
 * Parse and compare one specification fixture against one ICD fixture.
 * Keeping this helper isolated makes non-regression tests easier to extend.
 */
function runComparison(realFileName) {
  const specModel = parseSCL(loadFixture('spec.ssd'))
  const realModel = parseSCL(loadFixture(realFileName))

  return compareIED(
    specModel.ieds[0],
    realModel.ieds[0],
  )
}

test('compareIED marks a fully matching ICD as conform', () => {
  const result = runComparison('real-conform.icd')

  assert.deepEqual(result.summary, { total: 10, conformes: 10, partiels: 0, manquants: 0 })
  assert.equal(result.logicalDevices[0].status, 'conforme')
  assert.equal(result.services.every((service) => service.status === 'conforme'), true)
})

test('compareIED detects missing DA and missing service in non-regression fixture', () => {
  const result = runComparison('real-missing-da.icd')

  assert.equal(result.summary.total, 10)
  assert.equal(result.summary.conformes, 5)
  assert.equal(result.summary.partiels, 3)
  assert.equal(result.summary.manquants, 2)

  const mmxu = result.logicalDevices[0].logicalNodes.find((ln) => ln.lnClass === 'MMXU')
  assert.equal(mmxu.status, 'partiel')
  assert.deepEqual(mmxu.dataObjects[0].missingDAs, ['q'])
  assert.equal(result.services.find((service) => service.name === 'goose').status, 'manquant')
})
