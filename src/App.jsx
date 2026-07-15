import { useState } from 'react'
import { parseSCL } from './lib/parseSCL'
import { compareIED } from './lib/compareIED'
import FileUploadPanel from './components/FileUploadPanel'
import ComparisonReport from './components/ComparisonReport'

const TOOL_IDS = {
  compatibilityChecker: 'compatibility-checker',
  dataInstanceSearch: 'data-instance-search',
}

const TOOLS = [
  {
    id: TOOL_IDS.compatibilityChecker,
    label: 'IED compatibility Checker',
  },
  {
    id: TOOL_IDS.dataInstanceSearch,
    label: 'Search data instances',
  },
]

export default function App() {
  const [activeTool, setActiveTool] = useState(TOOL_IDS.compatibilityChecker)
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
      setError('Error while parsing the SSD file: ' + e.message)
    }
  }

  const handleICDLoad = (xmlString) => {
    try {
      const parsed = parseSCL(xmlString)
      setIcdData(parsed)
      setReport(null)
      setError(null)
    } catch (e) {
      setError('Error while parsing the ICD file: ' + e.message)
    }
  }

  const handleCompare = (iedName) => {
    if (!ssdData || !icdData) return
    try {
      const specIED = ssdData.ieds.find((i) => i.name === iedName)
      const realIED = icdData.ieds[0]
      if (!specIED) throw new Error(`IED "${iedName}" not found in the SSD file`)
      const result = compareIED(specIED, realIED)
      setReport(result)
      setError(null)
    } catch (e) {
      setError('Error while comparing IED data: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header with toolbox identity and tool navigation. */}
      <header className="border-b border-slate-800 px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-cyan-400" />
          <div>
            <h1 className="text-lg font-bold tracking-widest text-cyan-400 uppercase">IEC 61850</h1>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Tool selection">
          {TOOLS.map((tool) => {
            const isActive = activeTool === tool.id

            return (
              <button
                key={tool.id}
                type="button"
                className={`px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors border ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-600 hover:text-cyan-300'
                }`}
                aria-pressed={isActive}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="px-8 py-6 space-y-6">
        {activeTool === TOOL_IDS.compatibilityChecker && (
          <>
            {/* File loading panel for the IED compatibility checker. */}
            <FileUploadPanel
              ssdData={ssdData}
              icdData={icdData}
              onSSDLoad={handleSSDLoad}
              onICDLoad={handleICDLoad}
              onCompare={handleCompare}
            />

            {/* Compatibility checker error message. */}
            {error && (
              <div className="border border-red-500 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            {/* Compatibility checker report. */}
            {report && <ComparisonReport report={report} />}
          </>
        )}

        {activeTool === TOOL_IDS.dataInstanceSearch && <SearchDataInstancesPanel />}
      </main>
    </div>
  )
}

function SearchDataInstancesPanel() {
  return (
    <section className="border border-slate-700 bg-slate-900 p-6">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Tool panel</p>
      <h2 className="text-2xl font-bold text-slate-100 mb-3">Search data instances</h2>
      <p className="text-sm text-slate-400">
        This panel is ready for the future data instance search workflow.
      </p>
    </section>
  )
}
