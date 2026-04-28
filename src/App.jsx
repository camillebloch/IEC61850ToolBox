import { useState } from 'react'
import { parseSCL } from './lib/parseSCL'
import { compareIED } from './lib/compareIED'
import FileUploadPanel from './components/FileUploadPanel'
import ComparisonReport from './components/ComparisonReport'

export default function App() {
  const [ssdData, setSsdData] = useState(null)
  const [icdData, setIcdData] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  const handleSSDLoad = (xmlString) => {
    try {
      const parsed = parseSCL(xmlString)
      setSsdData(parsed)
      setReport(null)
      setError(null)
    } catch (e) {
      setError('Erreur lors du parsing du SSD : ' + e.message)
    }
  }

  const handleICDLoad = (xmlString) => {
    try {
      const parsed = parseSCL(xmlString)
      setIcdData(parsed)
      setReport(null)
      setError(null)
    } catch (e) {
      setError('Erreur lors du parsing de l\'ICD : ' + e.message)
    }
  }

  const handleCompare = (iedName) => {
    if (!ssdData || !icdData) return
    try {
      const specIED = ssdData.ieds.find((i) => i.name === iedName)
      const realIED = icdData.ieds[0]
      if (!specIED) throw new Error(`IED "${iedName}" introuvable dans le SSD`)
      const result = compareIED(specIED, realIED)
      setReport(result)
      setError(null)
    } catch (e) {
      setError('Erreur lors de la comparaison : ' + e.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-cyan-400" />
          <div>
            <h1 className="text-lg font-bold tracking-widest text-cyan-400 uppercase">IEC 61850</h1>
            <p className="text-xs text-slate-500 tracking-widest uppercase">IED Compatibility Checker</p>
          </div>
        </div>
      </header>

      <main className="px-8 py-6 space-y-6">
        {/* Panneau de chargement des fichiers */}
        <FileUploadPanel
          ssdData={ssdData}
          icdData={icdData}
          onSSDLoad={handleSSDLoad}
          onICDLoad={handleICDLoad}
          onCompare={handleCompare}
        />

        {/* Erreur */}
        {error && (
          <div className="border border-red-500 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Rapport */}
        {report && <ComparisonReport report={report} />}
      </main>
    </div>
  )
}