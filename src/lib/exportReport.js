import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

// ---------------------------------------------------------------------------
// Helpers communs
// ---------------------------------------------------------------------------
const STATUS_LABEL = {
  conforme:       'CONFORME',
  partiel:        'PARTIEL',
  manquant:       'MANQUANT',
  supplementaire: 'SUPPLÉMENTAIRE',
}

function collectRows(report) {
  const rows = []
  for (const ld of report.logicalDevices) {
    if (ld.status === 'supplementaire') {
      rows.push({ lDevice: ld.inst, ln: '—', doName: '—', type: 'LDevice', status: 'supplementaire', details: 'Non présent dans la spec SSD' })
      continue
    }
    for (const ln of ld.logicalNodes) {
      // Toujours afficher la ligne LN
      rows.push({
        lDevice: ld.inst,
        ln: ln.key,
        doName: '—',
        type: 'LN',
        status: ln.status,
        details: ln.details ?? '',
      })
      // Puis afficher les DO en dessous, indentés
      for (const doItem of ln.dataObjects ?? []) {
        rows.push({
          lDevice: '',
          ln: ln.key,
          doName: doItem.name,
          type: 'DO',
          status: doItem.status,
          details: doItem.details ?? '',
        })
      }
    }
    for (const ds of ld.datasets)
      rows.push({ lDevice: ld.inst, ln: 'LN0', doName: ds.name, type: 'Dataset', status: ds.status, details: ds.details ?? '' })
    for (const r of ld.reportControls)
      rows.push({ lDevice: ld.inst, ln: 'LN0', doName: r.name, type: 'RCB', status: r.status, details: r.details ?? '' })
    for (const g of ld.gseControls)
      rows.push({ lDevice: ld.inst, ln: 'LN0', doName: g.name, type: 'GOOSE', status: g.status, details: g.details ?? '' })
  }
  for (const svc of report.services) {
    rows.push({ lDevice: '—', ln: '—', doName: svc.name, type: 'Service', status: svc.status, details: svc.details ?? '' })
  }
  return rows
}
// ---------------------------------------------------------------------------
// Export PDF
// ---------------------------------------------------------------------------
export function exportPDF(report) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const { summary } = report
  const conformePct = summary.total > 0 ? Math.round((summary.conformes / summary.total) * 100) : 0

  // En-tête
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 297, 297, 'F')
  doc.setTextColor(34, 211, 238)
  doc.setFontSize(16)
  doc.setFont('courier', 'bold')
  doc.text('IEC 61850 — IED Compatibility Report', 14, 18)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(9)
  doc.text(`IED : ${report.iedName}   |   Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 25)

  // Résumé
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text(`Conformité globale : ${conformePct}%   |   Conformes : ${summary.conformes}   Partiels : ${summary.partiels}   Manquants : ${summary.manquants}`, 14, 35)

  // Tableau
  const rows = collectRows(report)
  autoTable(doc, {
    startY: 42,
    head: [['LDevice', 'LN', 'Élément', 'Type', 'Statut', 'Détails']],
    body: rows.map((r) => [r.lDevice, r.ln, r.doName, r.type, STATUS_LABEL[r.status] ?? r.status, r.details]),
    styles: { font: 'courier', fontSize: 7, cellPadding: 2, textColor: [226, 232, 240], fillColor: [15, 23, 42] },
    headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [30, 41, 59] },
    didParseCell(data) {
      if (data.column.index === 4) {
        const val = data.cell.raw
        if (val === 'CONFORME')       data.cell.styles.textColor = [52, 211, 153]
        else if (val === 'PARTIEL')   data.cell.styles.textColor = [251, 191, 36]
        else if (val === 'MANQUANT')  data.cell.styles.textColor = [248, 113, 113]
        else                          data.cell.styles.textColor = [100, 116, 139]
      }
    },
  })

  doc.save(`rapport_${report.iedName}_${Date.now()}.pdf`)
}

// ---------------------------------------------------------------------------
// Export Excel
// ---------------------------------------------------------------------------
export async function exportExcel(report) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'IEC 61850 Checker'
  workbook.created = new Date()

  // --- Feuille Résumé ---
  const summarySheet = workbook.addWorksheet('Résumé')
  summarySheet.columns = [
    { header: 'IED', key: 'ied', width: 20 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Conformes', key: 'conformes', width: 12 },
    { header: 'Partiels', key: 'partiels', width: 12 },
    { header: 'Manquants', key: 'manquants', width: 12 },
    { header: 'Conformité %', key: 'pct', width: 15 },
  ]
  styleHeader(summarySheet)
  const { summary } = report
  const pct = summary.total > 0 ? Math.round((summary.conformes / summary.total) * 100) : 0
  summarySheet.addRow({ ied: report.iedName, ...summary, pct: `${pct}%` })

  // --- Feuille Détail ---
  const detailSheet = workbook.addWorksheet('Détail')
  detailSheet.columns = [
    { header: 'LDevice', key: 'lDevice', width: 20 },
    { header: 'LN',      key: 'ln',      width: 16 },
    { header: 'Élément', key: 'doName',  width: 30 },
    { header: 'Type',    key: 'type',    width: 12 },
    { header: 'Statut',  key: 'status',  width: 16 },
    { header: 'Détails', key: 'details', width: 50 },
  ]
  styleHeader(detailSheet)

  const rows = collectRows(report)
  for (const row of rows) {
    const addedRow = detailSheet.addRow({ ...row, status: STATUS_LABEL[row.status] ?? row.status })
    const statusCell = addedRow.getCell('status')
    switch (row.status) {
      case 'conforme':       applyColor(statusCell, '22C55E', '052E16'); break
      case 'partiel':        applyColor(statusCell, 'F59E0B', '1C1400'); break
      case 'manquant':       applyColor(statusCell, 'EF4444', '1A0000'); break
      case 'supplementaire': applyColor(statusCell, '64748B', '0F172A'); break
    }
  }

  // Téléchargement
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport_${report.iedName}_${Date.now()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function styleHeader(sheet) {
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 20
}

function applyColor(cell, fgArgb, bgArgb) {
  cell.font = { bold: true, color: { argb: 'FF' + fgArgb } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgArgb } }
}