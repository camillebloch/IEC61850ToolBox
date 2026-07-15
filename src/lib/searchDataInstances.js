/**
 * Search SCL instance data using a DataTypeTemplates identifier.
 * The search resolves the identifier back to the LNodeType definitions that use it,
 * then inspects every LN/LN0 instance implementing those LNodeType definitions.
 */
export function searchDataInstancesByTypeId(sclModel, dataTypeId) {
  const normalizedId = dataTypeId.trim()

  if (!normalizedId) {
    return { status: 'empty', message: 'Enter a data type ID before launching the search.', matches: [] }
  }

  const typePaths = findTemplatePaths(sclModel.typeTemplates, normalizedId)

  if (typePaths.length === 0) {
    return {
      status: 'not-found',
      message: `No data type found for ID "${normalizedId}".`,
      matches: [],
    }
  }

  const matches = []

  for (const ied of sclModel.ieds) {
    for (const logicalDevice of ied.logicalDevices) {
      for (const logicalNode of logicalDevice.logicalNodes) {
        const pathsForNode = typePaths.filter((path) => path.lnTypeId === logicalNode.lnType)
        if (pathsForNode.length === 0) continue

        const instanceMatches = pathsForNode.map((path) => ({
          path,
          instance: findInstanceForPath(logicalNode.dataInstances, path),
        }))

        matches.push({ ied, logicalDevice, logicalNode, instanceMatches })
      }
    }
  }

  return {
    status: matches.length > 0 ? 'found' : 'no-ln',
    message: matches.length > 0
      ? `Data type "${normalizedId}" was found in ${typePaths.length} template path(s).`
      : `Data type "${normalizedId}" was found, but no LN or LN0 implements the resolved LNodeType.`,
    typePaths,
    matches,
  }
}

/**
 * Resolve the requested type identifier to concrete LNodeType / DO / DA paths.
 */
function findTemplatePaths(typeTemplates, dataTypeId) {
  const paths = []

  for (const [lnTypeId, lnType] of typeTemplates.lNodeTypes) {
    if (lnTypeId === dataTypeId) {
      for (const dataObject of lnType.dos) {
        paths.push({ lnTypeId, lnClass: lnType.lnClass, doName: dataObject.name, doTypeId: dataObject.type, daPath: [] })
      }
    }

    for (const dataObject of lnType.dos) {
      collectDoTypePaths(typeTemplates, dataObject.type, dataTypeId, {
        lnTypeId,
        lnClass: lnType.lnClass,
        doName: dataObject.name,
        doTypeId: dataObject.type,
        daPath: [],
      }, paths)
    }
  }

  return deduplicatePaths(paths)
}

/**
 * Walk DOType, DAType, and EnumType references until all matching paths are found.
 */
function collectDoTypePaths(typeTemplates, doTypeId, dataTypeId, basePath, paths, visited = new Set()) {
  const visitKey = `DO:${doTypeId}:${basePath.daPath.join('.')}`
  if (visited.has(visitKey)) return
  visited.add(visitKey)

  const doType = typeTemplates.doTypes.get(doTypeId)
  if (!doType) return

  if (doTypeId === dataTypeId) paths.push(basePath)

  for (const dataAttribute of doType.das) {
    const daPath = [...basePath.daPath, dataAttribute.name]

    if (dataAttribute.type === dataTypeId) {
      paths.push({ ...basePath, daPath, matchedAttribute: dataAttribute })
    }

    if (dataAttribute.bType === 'Enum' && dataAttribute.type === dataTypeId) {
      paths.push({ ...basePath, daPath, matchedAttribute: dataAttribute })
    }

    if (dataAttribute.bType === 'Struct' && dataAttribute.type) {
      collectDaTypePaths(typeTemplates, dataAttribute.type, dataTypeId, { ...basePath, daPath }, paths, visited)
    }
  }

  for (const subDataObject of doType.sdos) {
    collectDoTypePaths(typeTemplates, subDataObject.type, dataTypeId, {
      ...basePath,
      daPath: [...basePath.daPath, subDataObject.name],
    }, paths, visited)
  }
}

/**
 * Walk nested DAType structures and collect BDA paths matching the requested ID.
 */
function collectDaTypePaths(typeTemplates, daTypeId, dataTypeId, basePath, paths, visited) {
  const visitKey = `DA:${daTypeId}:${basePath.daPath.join('.')}`
  if (visited.has(visitKey)) return
  visited.add(visitKey)

  const daType = typeTemplates.daTypes.get(daTypeId)
  if (!daType) return

  if (daTypeId === dataTypeId) paths.push(basePath)

  for (const basicDataAttribute of daType.bdas) {
    const daPath = [...basePath.daPath, basicDataAttribute.name]

    if (basicDataAttribute.type === dataTypeId) {
      paths.push({ ...basePath, daPath, matchedAttribute: basicDataAttribute })
    }

    if (basicDataAttribute.bType === 'Struct' && basicDataAttribute.type) {
      collectDaTypePaths(typeTemplates, basicDataAttribute.type, dataTypeId, { ...basePath, daPath }, paths, visited)
    }
  }
}

/**
 * Find the DOI/DAI/SDI instance matching a resolved template path.
 */
function findInstanceForPath(dataInstances, path) {
  const doi = dataInstances.find((instance) => instance.name === path.doName)
  if (!doi || path.daPath.length === 0) return doi ?? null

  return findNestedInstance(doi.children, path.daPath)
}

function findNestedInstance(children, remainingPath) {
  if (remainingPath.length === 0) return null

  const [currentName, ...nextPath] = remainingPath
  const child = children.find((candidate) => candidate.name === currentName)
  if (!child) return null

  return nextPath.length === 0 ? child : findNestedInstance(child.children, nextPath)
}

function deduplicatePaths(paths) {
  const seen = new Set()

  return paths.filter((path) => {
    const key = `${path.lnTypeId}|${path.doName}|${path.doTypeId}|${path.daPath.join('.')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
