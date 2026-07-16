Feature: Parse SCL files
  As an IEC 61850 engineer
  I want to parse SSD content into a normalized model
  So that validation and comparison can rely on a deterministic structure

  Scenario: Parse a valid SSD file
    Given the fixture file "TestCase1.ssd"
    When I parse the SCL XML content
    Then the parsed IED list should contain exactly 1 item
    And the first logical device instance should be "LD0"

  Scenario: Parse an invalid XML root
    Given the XML payload "<Root/>"
    When I parse the SCL XML content
    Then a parse error should mention the missing "SCL" root element

  Scenario: Search returns every indexed DOI instance
    Given the XML payload
      """
      <SCL>
        <IED name="IED1">
          <AccessPoint name="AP1">
            <Server>
              <LDevice inst="LD0">
                <LN0 lnClass="LLN0" lnType="LLN0Type">
                  <DOI name="Beh" ix="1">
                    <DAI name="stVal"><Val>on</Val></DAI>
                  </DOI>
                  <DOI name="Beh" ix="2">
                    <DAI name="stVal"><Val>blocked</Val></DAI>
                  </DOI>
                </LN0>
              </LDevice>
            </Server>
          </AccessPoint>
        </IED>
        <DataTypeTemplates>
          <LNodeType id="LLN0Type" lnClass="LLN0">
            <DO name="Beh" type="BehType" />
          </LNodeType>
          <DOType id="BehType" cdc="ENS">
            <DA name="stVal" bType="Enum" type="BehaviorKind" />
          </DOType>
          <EnumType id="BehaviorKind">
            <EnumVal ord="1">on</EnumVal>
            <EnumVal ord="2">blocked</EnumVal>
          </EnumType>
        </DataTypeTemplates>
      </SCL>
      """
    When I search data instances for type ID "BehType"
    Then the search should return DOI indexes "1, 2"

  Scenario: Parse enum value labels from EnumVal text
    Given the XML payload
      """
      <SCL>
        <DataTypeTemplates>
          <EnumType id="BehaviorKind">
            <EnumVal ord="1">on</EnumVal>
            <EnumVal ord="2">blocked</EnumVal>
          </EnumType>
        </DataTypeTemplates>
      </SCL>
      """
    When I parse the SCL XML content
    Then enum type "BehaviorKind" should contain values "on, blocked"
