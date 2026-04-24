import { XMLParser } from 'fast-xml-parser'

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true, // 👈 supprime les préfixes de namespace
  isArray: (name) => [
    'IED', 'LDevice', 'LN', 'LN0', 'DO', 'DA', 'SDO', 'BDA',
    'DataSet', 'FCDA', 'ReportControl', 'GSEControl',
    'AccessPoint', 'Server', 'LNodeType', 'DOType', 'DAType',
    'EnumType', 'EnumVal', 'Private',
  ].includes(name),
}

const parser = new XMLParser(parserOptions)

export function parseSCL(xmlString) {
  const raw = parser.parse(xmlString)
  const scl = raw?.SCL

  if (!scl) throw new Error('Fichier SCL invalide : élément racine <SCL> introuvable')

  // Construire le dictionnaire des DataTypeTemplates
  const typeTemplates = parseDataTypeTemplates(scl)

  return {
    header: parseHeader(scl),
    ieds: parseIEDs(scl, typeTemplates),
    typeTemplates, // utile pour debug
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function parseHeader(scl) {
  return {
    id: scl.Header?.['@_id'] ?? null,
    version: scl.Header?.['@_version'] ?? null,
    revision: scl.Header?.['@_revision'] ?? null,
  }
}

// ---------------------------------------------------------------------------
// DataTypeTemplates — construit des Maps pour résolution rapide
// ---------------------------------------------------------------------------
function parseDataTypeTemplates(scl) {
  const dtt = scl.DataTypeTemplates
  if (!dtt) return { lNodeTypes: new Map(), doTypes: new Map(), daTypes: new Map() }

  // LNodeType : lnType id → { lnClass, dos: [{name, type, desc}] }
  const lNodeTypes = new Map()
  for (const lnt of dtt.LNodeType ?? []) {
    lNodeTypes.set(lnt['@_id'], {
      lnClass: lnt['@_lnClass'],
      iedType: lnt['@_iedType'] ?? null,
      desc: lnt['@_desc'] ?? null,
      dos: (lnt.DO ?? []).map((d) => ({
        name: d['@_name'],
        type: d['@_type'],
        desc: d['@_desc'] ?? null,
      })),
    })
  }

  // DOType : doType id → { cdc, das: [{name, bType, fc, desc}] }
  const doTypes = new Map()
  for (const dot of dtt.DOType ?? []) {
    doTypes.set(dot['@_id'], {
      cdc: dot['@_cdc'] ?? null,
      desc: dot['@_desc'] ?? null,
      das: (dot.DA ?? []).map((da) => ({
        name: da['@_name'],
        bType: da['@_bType'] ?? null,
        fc: da['@_fc'] ?? null,
        desc: da['@_desc'] ?? null,
      })),
      sdos: (dot.SDO ?? []).map((sdo) => ({
        name: sdo['@_name'],
        type: sdo['@_type'],
      })),
    })
  }

  // DAType : daType id → { bdas: [{name, bType, desc}] }
  const daTypes = new Map()
  for (const dat of dtt.DAType ?? []) {
    daTypes.set(dat['@_id'], {
      bdas: (dat.BDA ?? []).map((bda) => ({
        name: bda['@_name'],
        bType: bda['@_bType'] ?? null,
      })),
    })
  }

  return { lNodeTypes, doTypes, daTypes }
}

// ---------------------------------------------------------------------------
// IEDs
// ---------------------------------------------------------------------------
function parseIEDs(scl, typeTemplates) {
  return (scl.IED ?? []).map((ied) => ({
    name: ied['@_name'],
    type: ied['@_type'] ?? null,
    manufacturer: ied['@_manufacturer'] ?? null,
    desc: ied['@_desc'] ?? null,
    services: parseServices(ied),
    logicalDevices: parseLogicalDevices(ied, typeTemplates),
  }))
}

// ---------------------------------------------------------------------------
// Logical Devices
// ---------------------------------------------------------------------------
function parseLogicalDevices(ied, typeTemplates) {
  const lDevices = []
  for (const ap of ied.AccessPoint ?? []) {
    const servers = ap.Server ?? []
    for (const server of servers) {
      for (const ld of server.LDevice ?? []) {
        lDevices.push({
          inst: ld['@_inst'],
          desc: ld['@_desc'] ?? null,
          logicalNodes: parseLogicalNodes(ld, typeTemplates),
          datasets: parseDatasets(ld),
          reportControls: parseReportControls(ld),
          gseControls: parseGSEControls(ld),
        })
      }
    }
  }
  return lDevices
}

// ---------------------------------------------------------------------------
// Logical Nodes — résolution via DataTypeTemplates
// ---------------------------------------------------------------------------
function parseLogicalNodes(ld, { lNodeTypes, doTypes }) {
  const lns = [...(ld.LN0 ?? []), ...(ld.LN ?? [])]
  return lns.map((ln) => {
    const lnTypeId = ln['@_lnType']
    const lnTypeDef = lNodeTypes.get(lnTypeId)

    // Résolution des DO depuis DataTypeTemplates
    const dataObjects = (lnTypeDef?.dos ?? []).map((doRef) => {
      const doTypeDef = doTypes.get(doRef.type)
      return {
        name: doRef.name,
        desc: doRef.desc,
        cdc: doTypeDef?.cdc ?? null,
        dataAttributes: doTypeDef?.das ?? [],
        sdos: doTypeDef?.sdos ?? [],
      }
    })

    return {
      prefix: ln['@_prefix'] ?? '',
      lnClass: ln['@_lnClass'],
      inst: ln['@_inst'] ?? '',
      lnType: lnTypeId ?? null,
      desc: ln['@_desc'] ?? null,
      dataObjects,
    }
  })
}

// ---------------------------------------------------------------------------
// Datasets, RCBs, GSEControls (définis dans LN0)
// ---------------------------------------------------------------------------
function parseDatasets(ld) {
  const ln0 = ld.LN0?.[0]
  if (!ln0) return []
  return (ln0.DataSet ?? []).map((ds) => ({
    name: ds['@_name'],
    desc: ds['@_desc'] ?? null,
    fcdas: (ds.FCDA ?? []).map((f) => ({
      ldInst: f['@_ldInst'],
      prefix: f['@_prefix'] ?? '',
      lnClass: f['@_lnClass'],
      lnInst: f['@_lnInst'] ?? '',
      doName: f['@_doName'],
      daName: f['@_daName'] ?? null,
      fc: f['@_fc'],
    })),
  }))
}

function parseReportControls(ld) {
  const ln0 = ld.LN0?.[0]
  if (!ln0) return []
  return (ln0.ReportControl ?? []).map((rcb) => ({
    name: rcb['@_name'],
    desc: rcb['@_desc'] ?? null,
    rptID: rcb['@_rptID'] ?? null,
    datSet: rcb['@_datSet'] ?? null,
    buffered: rcb['@_buffered'] ?? null,
  }))
}

function parseGSEControls(ld) {
  const ln0 = ld.LN0?.[0]
  if (!ln0) return []
  return (ln0.GSEControl ?? []).map((gse) => ({
    name: gse['@_name'],
    desc: gse['@_desc'] ?? null,
    datSet: gse['@_datSet'] ?? null,
    appID: gse['@_appID'] ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
function parseServices(ied) {
  const s = ied.Services
  if (!s) return null
  return {
    reporting: s.ReportSettings != null,
    goose: s.GOOSE != null,
    gsse: s.GSSE != null,
    smv: s.SMVsc != null,
    dataSetDirectory: s.DataSetDirectory != null,
    getDataObjectDefinition: s.GetDataObjectDefinition != null,
    getDataSetValue: s.GetDataSetValue != null,
    setDataSetValue: s.SetDataSetValue != null,
    confDataSet: s.ConfDataSet != null,
    confReportControl: s.ConfReportControl != null,
    confLogControl: s.ConfLogControl != null,
    fileHandling: s.FileHandling != null,
    clientServices: s.ClientServices != null,
  }
}