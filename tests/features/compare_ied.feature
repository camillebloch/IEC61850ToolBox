Feature: Compare specification and implementation IED models
  As an IEC 61850 engineer
  I want to compare SSD requirements with ICD capabilities
  So that missing or partial coverage is visible early

  Scenario: Fully conform ICD
    Given the fixture file "TestCase1.ssd"
    And the fixture file "TestCase1_B1_match.icd"
    When I compare the specification model with the real model
    Then the comparison summary should report 11 conform elements
    And the logical device status should be "conforme"

  Scenario: ICD missing logical node
    Given the fixture file "TestCase1.ssd"
    And the fixture file "TestCase1_B1_missingLN.icd"
    When I compare the specification model with the real model
    Then the comparison summary should report 3 missing elements
    And the logical device status should be "manquant"
