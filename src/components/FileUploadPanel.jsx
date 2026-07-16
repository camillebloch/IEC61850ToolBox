import { useRef, useState } from 'react'

export default function FileUploadPanel({ ssdData, icdData, onSSDLoad, onICDLoad, onCompare }) {
  const ssdRef = useRef()
  const icdRef = useRef()
  const [selectedIED, setSelectedIED] = useState('')

  const readFile = (file, callback) => {
    const reader = new FileReader()
    reader.onload = (e) => callback(e.target.result)
    reader.readAsText(file)
  }

  const ieds = ssdData?.ieds ?? []
  const canCompare = ssdData && icdData && selectedIED

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* SSD file input. */}
      <FileZone
        label="SSD"
        sublabel="System Specification Description"
        accept=".ssd,.xml"
        loaded={!!ssdData}
        info={ssdData ? `${ssdData.ieds.length} IED(s) — rev. ${ssdData.header.revision ?? '?'}` : null}
        inputRef={ssdRef}
        onChange={(e) => e.target.files[0] && readFile(e.target.files[0], onSSDLoad)}
        onClick={() => ssdRef.current.click()}
      />

      {/* ICD file input. */}
      <FileZone
        label="ICD"
        sublabel="IED Capability Description"
        accept=".icd,.xml"
        loaded={!!icdData}
        info={icdData ? `${icdData.ieds.length} IED(s) — rev. ${icdData.header.revision ?? '?'}` : null}
        inputRef={icdRef}
        onChange={(e) => e.target.files[0] && readFile(e.target.files[0], onICDLoad)}
        onClick={() => icdRef.current.click()}
      />

      {/* IED selection and compatibility check trigger. */}
      <div className="border border-slate-700 bg-slate-900 p-4 flex flex-col justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">IED to check</p>
          <select
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
            value={selectedIED}
            onChange={(e) => setSelectedIED(e.target.value)}
            disabled={ieds.length === 0}
          >
            <option value="">— Select —</option>
            {ieds.map((ied) => (
              <option key={ied.name} value={ied.name}>{ied.name}</option>
            ))}
          </select>
        </div>
        <button
          className={`w-full py-2 text-sm font-bold tracking-widest uppercase transition-colors ${
            canCompare
              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          onClick={() => canCompare && onCompare(selectedIED)}
          disabled={!canCompare}
        >
          Run check
        </button>
      </div>
    </div>
  )
}

function FileZone({ label, sublabel, accept, loaded, info, inputRef, onChange, onClick }) {
  return (
    <div
      className={`border p-4 cursor-pointer transition-colors ${
        loaded
          ? 'border-cyan-600 bg-cyan-950/20'
          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
      }`}
      onClick={onClick}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase tracking-widest">{sublabel}</span>
        {loaded && <span className="text-xs text-cyan-400">✓ loaded</span>}
      </div>
      <p className="text-2xl font-bold text-slate-200">{label}</p>
      {info
        ? <p className="text-xs text-cyan-400 mt-1">{info}</p>
        : <p className="text-xs text-slate-600 mt-1">Click to load</p>
      }
    </div>
  )
}