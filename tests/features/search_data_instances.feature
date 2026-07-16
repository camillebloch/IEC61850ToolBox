Feature: Search SCL data instances
  As an IEC 61850 engineer
  I want to search instantiated data from DataTypeTemplates identifiers
  So that I can locate every LN, DOI, DAI, and SDI using a selected type

  Scenario: Search returns every indexed DOI instance for a DOType
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
    Then the search status should be "found"
    And the search should return DOI indexes "1, 2"
    And the search should include template paths "LLN0Type / Beh"

  Scenario: Search resolves EnumType identifiers to DAI values
    Given the XML payload
      """
      <SCL>
        <IED name="IED1">
          <AccessPoint name="AP1">
            <Server>
              <LDevice inst="LD0">
                <LN0 lnClass="LLN0" lnType="LLN0Type">
                  <DOI name="Beh">
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
    When I search data instances for type ID "BehaviorKind"
    Then the search status should be "found"
    And the search should include template paths "LLN0Type / Beh.stVal"
    And the search should return instance values "blocked"

  Scenario: Search resolves nested DAType identifiers to SDI values
    Given the XML payload
      """
      <SCL>
        <IED name="IED1">
          <AccessPoint name="AP1">
            <Server>
              <LDevice inst="LD0">
                <LN lnClass="MMXU" inst="1" lnType="MMXUType">
                  <DOI name="PhV">
                    <SDI name="phsA">
                      <DAI name="mag"><Val>230.5</Val></DAI>
                    </SDI>
                  </DOI>
                </LN>
              </LDevice>
            </Server>
          </AccessPoint>
        </IED>
        <DataTypeTemplates>
          <LNodeType id="MMXUType" lnClass="MMXU">
            <DO name="PhV" type="WYEType" />
          </LNodeType>
          <DOType id="WYEType" cdc="WYE">
            <SDO name="phsA" type="CMVType" />
          </DOType>
          <DOType id="CMVType" cdc="CMV">
            <DA name="mag" bType="Struct" type="AnalogValue" />
          </DOType>
          <DAType id="AnalogValue">
            <BDA name="f" bType="FLOAT32" />
          </DAType>
        </DataTypeTemplates>
      </SCL>
      """
    When I search data instances for type ID "AnalogValue"
    Then the search status should be "found"
    And the search should include template paths "MMXUType / PhV.phsA.mag"
    And the search should return instance values "230.5"

  Scenario: Search reports an unknown type identifier
    Given the XML payload
      """
      <SCL>
        <DataTypeTemplates>
          <LNodeType id="LLN0Type" lnClass="LLN0" />
        </DataTypeTemplates>
      </SCL>
      """
    When I search data instances for type ID "UnknownType"
    Then the search status should be "not-found"
