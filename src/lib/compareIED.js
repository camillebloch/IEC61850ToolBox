/**
 * Compare un IED spécifié (SSD) avec un IED réel (ICD)
 * Les deux objets sont issus de parseSCL()
 */
export function compareIED(specIED, realIED, specTemplates, realTemplates) {
  const results = {
    iedName: specIED.name,
    summary: { total: 0, conformes: 0, partiels: 0, manquants: 0 },
    logicalDevices: [],
    services: compareServices(specIED.services, realIED.services),
  }

  // Comparer chaque LDevice spécifié
  for (const specLD of specIED.logicalDevices) {
    const realLD = realIED.logicalDevices.find((ld) => ld.inst === specLD.inst)

    if (!realLD) {
      // LDevice entièrement manquant
      const missing = {
        inst: specLD.inst,
        status: 'manquant',
        logicalNodes: specLD.logicalNodes.map((ln) => ({
          ...ln,
          key: `${ln.prefix}${ln.lnClass}${ln.inst}`, 
          status: 'manquant',
          dataObjects: ln.dataObjects.map((d) => ({ ...d, status: 'manquant' })),
        })),
        datasets: specLD.datasets.map((d) => ({ ...d, status: 'manquant' })),
        reportControls: specLD.reportControls.map((r) => ({ ...r, status: 'manquant' })),
        gseControls: specLD.gseControls.map((g) => ({ ...g, status: 'manquant' })),
      }
      results.logicalDevices.push(missing)
      continue
    }

    // LDevice trouvé — comparer son contenu
    const ldResult = {
      inst: specLD.inst,
      status: 'conforme',
      logicalNodes: compareLogicalNodes(
        specLD.logicalNodes, realLD.logicalNodes,
        specTemplates, realTemplates
      ),
      datasets: compareByName(specLD.datasets, realLD.datasets),
      reportControls: compareByName(specLD.reportControls, realLD.reportControls),
      gseControls: compareByName(specLD.gseControls, realLD.gseControls),
    }

    // Statut global du LDevice
    const allItems = [
      ...ldResult.logicalNodes,
      ...ldResult.datasets,
      ...ldResult.reportControls,
      ...ldResult.gseControls,
    ]
    if (allItems.some((i) => i.status === 'manquant')) ldResult.status = 'manquant'
    else if (allItems.some((i) => i.status === 'partiel')) ldResult.status = 'partiel'

    results.logicalDevices.push(ldResult)
  }

  // Détecter les LDevices supplémentaires dans l'ICD (non spécifiés)
  for (const realLD of realIED.logicalDevices) {
    const exists = specIED.logicalDevices.find((ld) => ld.inst === realLD.inst)
    if (!exists) {
      results.logicalDevices.push({
        inst: realLD.inst,
        status: 'supplementaire',
        logicalNodes: [],
        datasets: [],
        reportControls: [],
        gseControls: [],
      })
    }
  }

  // Calcul du résumé
  const allStatuses = collectStatuses(results)
  results.summary.total = allStatuses.length
  results.summary.conformes = allStatuses.filter((s) => s === 'conforme').length
  results.summary.partiels = allStatuses.filter((s) => s === 'partiel').length
  results.summary.manquants = allStatuses.filter((s) => s === 'manquant').length

  return results
}

// ---------------------------------------------------------------------------
// Comparaison des Logical Nodes
// ---------------------------------------------------------------------------
function compareLogicalNodes(specLNs, realLNs, specTemplates, realTemplates) {
  const results = []

  for (const specLN of specLNs) {
    const key = `${specLN.prefix}${specLN.lnClass}${specLN.inst}`
    const realLN = realLNs.find(
      (ln) => ln.lnClass === specLN.lnClass &&
              ln.inst === specLN.inst &&
              ln.prefix === specLN.prefix
    )

    if (!realLN) {
      results.push({
        key,
        lnClass: specLN.lnClass,
        prefix: specLN.prefix,
        inst: specLN.inst,
        status: 'manquant',
        lnTypeMatch: false,
        dataObjects: specLN.dataObjects.map((d) => ({ ...d, status: 'manquant' })),
        details: `LN ${key} absent de l'ICD`,
      })
      continue
    }

    const lnTypeMatch = specLN.lnType === realLN.lnType
    const doResults = compareDataObjects(
      specLN.dataObjects, realLN.dataObjects,
      specLN.lnType, realLN.lnType,
      specTemplates, realTemplates
    )

    const status = doResults.some((d) => d.status === 'manquant') ? 'manquant'
      : doResults.some((d) => d.status === 'partiel') || !lnTypeMatch ? 'partiel'
      : 'conforme'

    results.push({
      key,
      lnClass: specLN.lnClass,
      prefix: specLN.prefix,
      inst: specLN.inst,
      status,
      lnTypeMatch,
      specLnType: specLN.lnType,
      realLnType: realLN.lnType,
      dataObjects: doResults,
      details: lnTypeMatch ? null : `lnType différent — spec: ${specLN.lnType} / réel: ${realLN.lnType}`,
    })
  }

  // LNs supplémentaires dans l'ICD
  for (const realLN of realLNs) {
    const exists = specLNs.find(
      (ln) => ln.lnClass === realLN.lnClass &&
              ln.inst === realLN.inst &&
              ln.prefix === realLN.prefix
    )
    if (!exists) {
      results.push({
        key: `${realLN.prefix}${realLN.lnClass}${realLN.inst}`,
        lnClass: realLN.lnClass,
        prefix: realLN.prefix,
        inst: realLN.inst,
        status: 'supplementaire',
        dataObjects: [],
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Comparaison des Data Objects
// ---------------------------------------------------------------------------
function compareDataObjects(specDOs, realDOs, specLnTypeId, realLnTypeId, specTemplates, realTemplates) {
  // Si même lnType → on compare directement par nom
  // Si lnType différent → on compare via les DataTypeTemplates respectifs
  const results = []

  for (const specDO of specDOs) {
    const realDO = realDOs.find((d) => d.name === specDO.name)

    if (!realDO) {
      results.push({ name: specDO.name, status: 'manquant', details: `DO ${specDO.name} absent` })
      continue
    }

    // Comparer les DA
    const missingDAs = specDO.dataAttributes.filter(
      (specDA) => !realDO.dataAttributes.find((rDA) => rDA.name === specDA.name && rDA.fc === specDA.fc)
    )

    const status = missingDAs.length === 0 ? 'conforme'
      : missingDAs.length === specDO.dataAttributes.length ? 'manquant'
      : 'partiel'

    results.push({
      name: specDO.name,
      cdc: specDO.cdc,
      status,
      missingDAs: missingDAs.map((da) => da.name),
      details: missingDAs.length > 0
        ? `DA manquants : ${missingDAs.map((d) => d.name).join(', ')}`
        : null,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Comparaison générique par nom
// ---------------------------------------------------------------------------
function compareByName(specItems, realItems) {
  const results = []
  for (const spec of specItems) {
    const real = realItems.find((r) => r.name === spec.name)
    results.push({
      name: spec.name,
      status: real ? 'conforme' : 'manquant',
      details: real ? null : `${spec.name} absent de l'ICD`,
    })
  }
  for (const real of realItems) {
    if (!specItems.find((s) => s.name === real.name)) {
      results.push({ name: real.name, status: 'supplementaire' })
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Comparaison des Services
// ---------------------------------------------------------------------------
function compareServices(specServices, realServices) {
  if (!specServices) return []
  const results = []
  for (const [key, specVal] of Object.entries(specServices)) {
    if (!specVal) continue // service non requis dans la spec
    const realVal = realServices?.[key] ?? false
    results.push({
      name: key,
      status: realVal ? 'conforme' : 'manquant',
      details: realVal ? null : `Service ${key} non supporté par l'ICD`,
    })
  }
  return results
}

// ---------------------------------------------------------------------------
// Collecte de tous les statuts pour le résumé
// ---------------------------------------------------------------------------
function collectStatuses(results) {
  const statuses = []
  for (const ld of results.logicalDevices) {
    for (const ln of ld.logicalNodes) {
      statuses.push(ln.status)
      for (const doItem of ln.dataObjects) {
        statuses.push(doItem.status)
      }
    }
    for (const ds of ld.datasets) statuses.push(ds.status)
    for (const rcb of ld.reportControls) statuses.push(rcb.status)
    for (const gse of ld.gseControls) statuses.push(gse.status)
  }
  for (const svc of results.services) statuses.push(svc.status)
  return statuses.filter((s) => s !== 'supplementaire')
}