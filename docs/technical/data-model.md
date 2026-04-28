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
          logicalNodes,
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
    daTypes
  }
}
```

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
