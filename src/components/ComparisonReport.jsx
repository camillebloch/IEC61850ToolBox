import { exportPDF, exportExcel } from '../lib/exportReport'

const STATUS_COLORS = {
  conforme:      'text-emerald-400',
  partiel:       'text-amber-400',
  manquant:      'text-red-400',
  supplementaire:'text-slate-500',
}

const STATUS_BG = {
  conforme:      'bg-emerald-950/40 border-emerald-800',
  partiel:       'bg-amber-950/40 border-amber-800',
  manquant:      'bg-red-950/40 border-red-900',
  supplementaire:'bg-slate-900 border-slate-700',
}

const STATUS_BADGE = {
  conforme:      'bg-emerald-900 text-emerald-300',
  partiel:       'bg-amber-900 text-amber-300',
  manquant:      'bg-red-900 text-red-300',
  supplementaire:'bg-slate-800 text-slate-400',
}

const STATUS_LABEL = {
  conforme:      'CONFORME',
  partiel:       'PARTIEL',
  manquant:      'MANQUANT',
  supplementaire:'SUPPLÉMENTAIRE',
}

export default function ComparisonReport({ report }) {
  const { summary, logicalDevices, services } = report
  const conformePct = summary.total > 0 ? Math.round((summary.conformes / summary.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-slate-400">Résumé — {report.iedName}</h2>
          <span className={`text-2xl font-bold ${conformePct === 100 ? 'text-emerald-400' : conformePct > 70 ? 'text-amber-400' : 'text-red-400'}`}>
            {conformePct}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatBox label="Conformes" value={summary.conformes} color="text-emerald-400" />
          <StatBox label="Partiels"  value={summary.partiels}  color="text-amber-400" />
          <StatBox label="Manquants" value={summary.manquants} color="text-red-400" />
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
        <button
            onClick={() => exportPDF(report)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
            ↓ Export PDF
        </button>
        <button
            onClick={() => exportExcel(report)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
            ↓ Export Excel
        </button>
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <Section title="Services ACSI">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {services.map((svc) => (
              <div key={svc.name} className={`border px-3 py-2 text-xs ${STATUS_BG[svc.status]}`}>
                <span className={`font-mono ${STATUS_COLORS[svc.status]}`}>{svc.name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Logical Devices */}
      {logicalDevices.map((ld) => (
        <Section key={ld.inst} title={`LDevice : ${ld.inst}`} status={ld.status}>
          {ld.status === 'supplementaire' ? (
            <p className="text-xs text-slate-500 italic">LDevice non présent dans la spécification SSD</p>
          ) : (
            <div className="space-y-3">
              {ld.logicalNodes.map((ln) => (
                <LNRow key={ln.key} ln={ln} />
              ))}
              {ld.datasets.length > 0 && (
                <SubSection title="Datasets">
                  {ld.datasets.map((ds) => <ItemRow key={ds.name} item={ds} />)}
                </SubSection>
              )}
              {ld.reportControls.length > 0 && (
                <SubSection title="Report Controls">
                  {ld.reportControls.map((r) => <ItemRow key={r.name} item={r} />)}
                </SubSection>
              )}
              {ld.gseControls.length > 0 && (
                <SubSection title="GSE Controls">
                  {ld.gseControls.map((g) => <ItemRow key={g.name} item={g} />)}
                </SubSection>
              )}
            </div>
          )}
        </Section>
      ))}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function Section({ title, status, children }) {
  return (
    <div className="border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold tracking-wide text-slate-200">{title}</h3>
        {status && <Badge status={status} />}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SubSection({ title, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function LNRow({ ln }) {
  return (
    <div className={`border px-3 py-2 ${STATUS_BG[ln.status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-mono font-bold text-slate-200">{ln.key}</span>
        <Badge status={ln.status} />
      </div>
      {ln.details && <p className="text-xs text-amber-400 mb-2">{ln.details}</p>}
      {ln.dataObjects?.length > 0 && ln.status !== 'conforme' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-2">
          {ln.dataObjects.map((doItem) => (
            <div key={doItem.name} className={`text-xs px-2 py-1 ${STATUS_BADGE[doItem.status]}`}>
              <span className="font-mono">{doItem.name}</span>
              {doItem.details && <span className="ml-1 opacity-60">!</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item }) {
  return (
    <div className="flex items-center justify-between text-xs px-2 py-1 border border-slate-800">
      <span className="font-mono text-slate-300">{item.name}</span>
      <Badge status={item.status} />
    </div>
  )
}

function Badge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 font-bold tracking-widest ${STATUS_BADGE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}