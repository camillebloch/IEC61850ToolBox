import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { Before, Given, Then, When } from '@cucumber/cucumber'
import { parseSCL } from '../../../src/lib/parseSCL.js'
import { compareIED } from '../../../src/lib/compareIED.js'
import { getFixturePath } from '../../fixtures/fixturePaths.js'
import { ensureFixturesGenerated } from '../../helpers/ensureFixtures.js'

/**
 * Initialize fixture files once before executing Cucumber scenarios.
 */
Before(() => {
  ensureFixturesGenerated()
})

/**
 * Reset scenario state to guarantee scenario isolation.
 */
Before(function resetScenarioContext() {
  this.fixturePayloads = []
  this.xmlPayload = undefined
  this.parsedResult = undefined
  this.parseError = undefined
  this.comparisonResult = undefined
})

Given('the generated fixture {string}', function loadGeneratedFixture(fileName) {
  const fixturePath = getFixturePath(fileName)

  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}. Run "npm run test:fixtures" first.`)
  }

  const payload = readFileSync(fixturePath, 'utf-8')
  this.fixturePayloads.push(payload)
  this.xmlPayload = payload
})

Given('the XML payload {string}', function setInlineXmlPayload(xmlPayload) {
  this.xmlPayload = xmlPayload
})

When('I parse the SCL XML content', function parseSclXmlContent() {
  this.parseError = undefined

  try {
    this.parsedResult = parseSCL(this.xmlPayload)
  } catch (error) {
    this.parseError = error
  }
})

When('I compare the specification model with the real model', function compareSpecificationWithRealModel() {
  assert.equal(this.fixturePayloads.length, 2, 'Two generated fixtures are required for comparison.')

  const specModel = parseSCL(this.fixturePayloads[0])
  const realModel = parseSCL(this.fixturePayloads[1])

  this.comparisonResult = compareIED(specModel.ieds[0], realModel.ieds[0])
})

Then('the parsed IED list should contain exactly {int} item', function verifyParsedIedCount(expectedCount) {
  assert.ok(this.parsedResult, 'Expected a parsed model but no result was produced.')
  assert.equal(this.parsedResult.ieds.length, expectedCount)
})

Then('the first logical device instance should be {string}', function verifyFirstLogicalDevice(expectedInst) {
  assert.equal(this.parsedResult.ieds[0].logicalDevices[0].inst, expectedInst)
})

Then('a parse error should mention the missing {string} root element', function verifyMissingRootError(rootName) {
  assert.ok(this.parseError, 'Expected parse failure but parsing succeeded.')
  assert.match(this.parseError.message, new RegExp(`<${rootName}>`))
})

Then('the comparison summary should report {int} conform elements', function verifyConformSummary(expectedConform) {
  assert.equal(this.comparisonResult.summary.conformes, expectedConform)
})

Then('the comparison summary should report {int} missing elements', function verifyMissingSummary(expectedMissing) {
  assert.equal(this.comparisonResult.summary.manquants, expectedMissing)
})

Then('the logical device status should be {string}', function verifyLogicalDeviceStatus(expectedStatus) {
  assert.equal(this.comparisonResult.logicalDevices[0].status, expectedStatus)
})

Then('the MMXU logical node should be marked as {string}', function verifyMmxuStatus(expectedStatus) {
  const mmxu = this.comparisonResult.logicalDevices[0].logicalNodes.find((logicalNode) => logicalNode.lnClass === 'MMXU')
  assert.ok(mmxu, 'Expected MMXU logical node to be present in comparison output.')
  assert.equal(mmxu.status, expectedStatus)
})
