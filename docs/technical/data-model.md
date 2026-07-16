# Data Model

## Parsed SCL model (`parseSCL` output)

```text
{
  header: {
    id,
    version,
    revision
  },
  ieds: [
    {
      name,
      type,
      manufacturer,
      desc,
      services,
      logicalDevices: [
        {
          inst,
          desc,
          logicalNodes: [
            {
              prefix,
              lnClass,
              inst,
              lnType,
              desc,
              dataObjects,
              dataInstances
            }
          ],
          datasets,
          reportControls,
          gseControls
        }
      ]
    }
  ],
  typeTemplates: {
    lNodeTypes,
    doTypes,
    daTypes,
    enumTypes
  }
}
```

## Instance data model

`dataInstances` preserves configured SCL instance values below each LN or LN0:

```text
{
  kind,      // DOI, SDI, or DAI
  name,
  ix,
  desc,
  value,     // joined display value or null
  values,    // all Val text nodes
  children   // nested SDI and DAI entries
}
```

The optional `ix` field is retained so indexed DOI or SDI entries can be displayed and tested independently.

## Search result model (`searchDataInstancesByTypeId` output)

```text
{
  status,
  message,
  typePaths: [
    {
      lnTypeId,
      lnClass,
      doName,
      doTypeId,
      daPath,
      matchedAttribute
    }
  ],
  matches: [
    {
      ied,
      logicalDevice,
      logicalNode,
      instanceMatches: [
        {
          path,
          instance
        }
      ]
    }
  ]
}
```

`instance` is `null` when a logical node uses the resolved template path but no DOI, SDI, or DAI instance is configured for that path.

## Comparison report model (`compareIED` output)

```text
{
  iedName,
  summary: {
    total,
    conformes,
    partiels,
    manquants
  },
  logicalDevices: [
    {
      inst,
      status,
      logicalNodes,
      datasets,
      reportControls,
      gseControls
    }
  ],
  services: [
    {
      name,
      status,
      details
    }
  ]
}
```

## Status vocabulary

- `conforme`
- `partiel`
- `manquant`
- `supplementaire`
