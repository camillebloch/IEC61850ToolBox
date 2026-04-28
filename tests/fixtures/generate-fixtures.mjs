import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Test fixture catalog used by unit and non-regression tests.
 * Keep all XML strings centralized here so updates are explicit and reviewable.
 */
const fixtures = {
  'spec.ssd': `<?xml version="1.0" encoding="UTF-8"?>
<SCL>
  <Header id="spec-header" version="1" revision="1"/>
  <DataTypeTemplates>
    <LNodeType id="LNT_LLN0" lnClass="LLN0">
      <DO name="Beh" type="DOT_Beh"/>
    </LNodeType>
    <LNodeType id="LNT_MMXU" lnClass="MMXU">
      <DO name="TotW" type="DOT_MV"/>
      <DO name="Hz" type="DOT_MV"/>
    </LNodeType>
    <DOType id="DOT_Beh" cdc="ENS">
      <DA name="stVal" bType="Enum" fc="ST"/>
    </DOType>
    <DOType id="DOT_MV" cdc="MV">
      <DA name="mag" bType="Struct" fc="MX"/>
      <DA name="q" bType="Quality" fc="MX"/>
    </DOType>
  </DataTypeTemplates>
  <IED name="IED_SPEC">
    <Services>
      <ReportSettings/>
      <GOOSE/>
    </Services>
    <AccessPoint name="AP1">
      <Server>
        <LDevice inst="LD0">
          <LN0 lnClass="LLN0" lnType="LNT_LLN0" inst="">
            <DataSet name="DS_MEAS">
              <FCDA ldInst="LD0" lnClass="MMXU" lnInst="1" doName="TotW" fc="MX"/>
            </DataSet>
            <ReportControl name="RCB1" datSet="DS_MEAS" buffered="true"/>
            <GSEControl name="GCB1" datSet="DS_MEAS" appID="A1"/>
          </LN0>
          <LN prefix="" lnClass="MMXU" inst="1" lnType="LNT_MMXU"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>
`,
  'real-conform.icd': `<?xml version="1.0" encoding="UTF-8"?>
<SCL>
  <Header id="real-header" version="1" revision="2"/>
  <DataTypeTemplates>
    <LNodeType id="LNT_LLN0" lnClass="LLN0">
      <DO name="Beh" type="DOT_Beh"/>
    </LNodeType>
    <LNodeType id="LNT_MMXU" lnClass="MMXU">
      <DO name="TotW" type="DOT_MV"/>
      <DO name="Hz" type="DOT_MV"/>
    </LNodeType>
    <DOType id="DOT_Beh" cdc="ENS">
      <DA name="stVal" bType="Enum" fc="ST"/>
    </DOType>
    <DOType id="DOT_MV" cdc="MV">
      <DA name="mag" bType="Struct" fc="MX"/>
      <DA name="q" bType="Quality" fc="MX"/>
    </DOType>
  </DataTypeTemplates>
  <IED name="IED_SPEC">
    <Services>
      <ReportSettings/>
      <GOOSE/>
    </Services>
    <AccessPoint name="AP1">
      <Server>
        <LDevice inst="LD0">
          <LN0 lnClass="LLN0" lnType="LNT_LLN0" inst="">
            <DataSet name="DS_MEAS">
              <FCDA ldInst="LD0" lnClass="MMXU" lnInst="1" doName="TotW" fc="MX"/>
            </DataSet>
            <ReportControl name="RCB1" datSet="DS_MEAS" buffered="true"/>
            <GSEControl name="GCB1" datSet="DS_MEAS" appID="A1"/>
          </LN0>
          <LN prefix="" lnClass="MMXU" inst="1" lnType="LNT_MMXU"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>
`,
  'real-missing-da.icd': `<?xml version="1.0" encoding="UTF-8"?>
<SCL>
  <Header id="real-missing-da" version="1" revision="1"/>
  <DataTypeTemplates>
    <LNodeType id="LNT_LLN0" lnClass="LLN0">
      <DO name="Beh" type="DOT_Beh"/>
    </LNodeType>
    <LNodeType id="LNT_MMXU" lnClass="MMXU">
      <DO name="TotW" type="DOT_MV_PARTIAL"/>
      <DO name="Hz" type="DOT_MV_PARTIAL"/>
    </LNodeType>
    <DOType id="DOT_Beh" cdc="ENS">
      <DA name="stVal" bType="Enum" fc="ST"/>
    </DOType>
    <DOType id="DOT_MV_PARTIAL" cdc="MV">
      <DA name="mag" bType="Struct" fc="MX"/>
    </DOType>
  </DataTypeTemplates>
  <IED name="IED_SPEC">
    <Services>
      <ReportSettings/>
    </Services>
    <AccessPoint name="AP1">
      <Server>
        <LDevice inst="LD0">
          <LN0 lnClass="LLN0" lnType="LNT_LLN0" inst="">
            <DataSet name="DS_MEAS">
              <FCDA ldInst="LD0" lnClass="MMXU" lnInst="1" doName="TotW" fc="MX"/>
            </DataSet>
            <ReportControl name="RCB1" datSet="DS_MEAS" buffered="true"/>
          </LN0>
          <LN prefix="" lnClass="MMXU" inst="1" lnType="LNT_MMXU"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>
`,
}

await Promise.all(
  Object.entries(fixtures).map(([fileName, content]) =>
    fs.writeFile(path.join(__dirname, fileName), content, 'utf-8')
  )
)

console.log(`Generated ${Object.keys(fixtures).length} SSD/ICD fixtures in ${__dirname}`)
