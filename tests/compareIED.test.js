import { readFileSync, existsSync } from 'node:fs'
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSCL } from '../src/lib/parseSCL.js'
import { compareIED } from '../src/lib/compareIED.js'
import { getFixturePath } from './fixtures/fixturePaths.js'
import { ensureFixturesGenerated } from './helpers/ensureFixtures.js'

function loadFixture(fileName) {
  const fixturePath = getFixturePath(fileName)

  // Fail fast with an actionable message when fixture generation is missing.
  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}. Run "npm run test:fixtures" first.`)
  }

  return readFileSync(fixturePath, 'utf-8')
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

describe('compareIED BDD specifications', () => {
  before(() => {
    ensureFixturesGenerated()
  })

  it('Given a fully matching ICD, When comparing, Then every expected item is conform', () => {
    const result = runComparison('real-conform.icd')

    assert.deepEqual(result.summary, { total: 10, conformes: 10, partiels: 0, manquants: 0 })
    assert.equal(result.logicalDevices[0].status, 'conforme')
    assert.equal(result.services.every((service) => service.status === 'conforme'), true)
  })

  it('Given an ICD with missing DA and missing service, When comparing, Then partial and missing statuses are reported', () => {
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
})
