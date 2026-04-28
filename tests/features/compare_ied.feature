Feature: Compare specification and implementation IED models
  As an IEC 61850 engineer
  I want to compare SSD requirements with ICD capabilities
  So that missing or partial coverage is visible early

  Scenario: Fully conform ICD
    Given the generated fixture "spec.ssd"
    And the generated fixture "real-conform.icd"
    When I compare the specification model with the real model
    Then the comparison summary should report 10 conform elements
    And the logical device status should be "conforme"

  Scenario: Missing DA and service in ICD
    Given the generated fixture "spec.ssd"
    And the generated fixture "real-missing-da.icd"
    When I compare the specification model with the real model
    Then the comparison summary should report 2 missing elements
    And the MMXU logical node should be marked as "partiel"
