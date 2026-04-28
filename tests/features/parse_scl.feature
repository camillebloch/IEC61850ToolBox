Feature: Parse SCL files
  As an IEC 61850 engineer
  I want to parse SSD content into a normalized model
  So that validation and comparison can rely on a deterministic structure

  Scenario: Parse a valid SSD file
    Given the generated fixture "spec.ssd"
    When I parse the SCL XML content
    Then the parsed IED list should contain exactly 1 item
    And the first logical device instance should be "LD0"

  Scenario: Parse an invalid XML root
    Given the XML payload "<Root/>"
    When I parse the SCL XML content
    Then a parse error should mention the missing "SCL" root element
