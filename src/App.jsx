import { parseSCL } from './lib/parseSCL'
import { compareIED } from './lib/compareIED'
import { useState } from 'react'

function App() {
  const [ssdData, setSsdData] = useState(null)
  const [report, setReport] = useState(null)

  const handleSSD = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      const parsed = parseSCL(evt.target.result)
      setSsdData(parsed)
      console.log('SSD parsé:', parsed)
    }
    reader.readAsText(file)
  }

  const handleICD = (e) => {
    if (!ssdData) return alert('Charge le SSD en premier')
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      const icdParsed = parseSCL(evt.target.result)
      const specIED = ssdData.ieds.find((i) => i.name === 'Depart')
      const realIED = icdParsed.ieds[0]
      const result = compareIED(specIED, realIED, ssdData.typeTemplates, icdParsed.typeTemplates)
      setReport(result)
      console.log('Rapport:', result)
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Test comparaison</h1>
      <div>
        <label>1. SSD : </label>
        <input type="file" accept=".ssd,.isd" onChange={handleSSD} />
      </div>
      <div>
        <label>2. ICD : </label>
        <input type="file" accept=".icd,.iid" onChange={handleICD} />
      </div>
      {report && (
        <pre style={{ fontSize: 12 }}>
          {JSON.stringify(report.summary, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default App