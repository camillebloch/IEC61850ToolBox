import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_RULE_FORM = {
  action: 'delete',
  extensions: ['icd', 'iid'],
  xpath: '',
  target: 'text',
  search: '',
  replace: '',
  attribute: '',
  value: '',
  name: '',
  ancestor: 'IED',
}

function normalizeRulesData(data) {
  const hardcodedPatches = {}
  const rawHardcoded = data?.hardcodedPatches ?? {}

  Object.entries(rawHardcoded).forEach(([name, setting]) => {
    if (typeof setting === 'boolean') {
      hardcodedPatches[name] = { enabled: setting, extensions: [] }
      return
    }

    hardcodedPatches[name] = {
      enabled: setting?.enabled !== false,
      extensions: Array.isArray(setting?.extensions) ? setting.extensions.map(String) : [],
    }
  })

  const rules = Array.isArray(data?.rules) ? data.rules.map((rule, index) => ({
    ...rule,
    enabled: rule?.enabled !== false,
    key: `${index}-${rule?.action ?? 'rule'}-${rule?.xpath ?? 'xpath'}`,
  })) : []

  return { hardcodedPatches, rules }
}

function buildExportConfig(patchState) {
  const hardcodedPatches = Object.fromEntries(
    Object.entries(patchState.hardcodedPatches).map(([name, setting]) => {
      const extensions = Array.isArray(setting.extensions) ? setting.extensions.filter(Boolean) : []
      if (setting.enabled) {
        return [name, extensions.length > 0 ? { enabled: true, extensions } : true]
      }

      const disabled = { enabled: false }
      if (extensions.length > 0) {
        disabled.extensions = extensions
      }
      return [name, disabled]
    })
  )

  const rules = patchState.rules
    .map((rule) => {
      const sanitizedRule = { ...rule }
      delete sanitizedRule.key
      return sanitizedRule
    })

  return { hardcodedPatches, rules }
}

const PATCH_API_URL = (import.meta.env.VITE_PATCH_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

export default function SclPatchTool() {
  const sourceInputRef = useRef(null)
  const [sourceFiles, setSourceFiles] = useState([])
  const [patchState, setPatchState] = useState({ hardcodedPatches: {}, rules: [] })
  const [loadingError, setLoadingError] = useState('')
  const [runStatus, setRunStatus] = useState('')
  const [pendingDownloads, setPendingDownloads] = useState([])
  const [isPatching, setIsPatching] = useState(false)
  const [editingRuleKey, setEditingRuleKey] = useState(null)
  const [ruleForm, setRuleForm] = useState(DEFAULT_RULE_FORM)

  useEffect(() => {
    const rulesUrl = `${import.meta.env.BASE_URL}ples-iop-rules.json`

    fetch(rulesUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load rules JSON (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        setPatchState(normalizeRulesData(data))
      })
      .catch((error) => {
        setLoadingError(`${error.message}. The rules file must be published under the GitHub Pages base URL and the site may need a fresh deploy.`)
      })
  }, [])

  const exportedConfig = useMemo(() => buildExportConfig(patchState), [patchState])

  const commandPreview = useMemo(() => {
    if (sourceFiles.length === 0) {
      return 'Select an input SCL file to preview the CLI command.'
    }

    return sourceFiles
      .map((file) => `python .\\scripts\\update-scl-for-ples.py "${file.name}" --rules ".\\public\\ples-iop-rules.json"`)
      .join('\n')
  }, [sourceFiles])

  const handleToggleHardcodedPatch = (patchName) => {
    setPatchState((previous) => ({
      ...previous,
      hardcodedPatches: {
        ...previous.hardcodedPatches,
        [patchName]: {
          ...previous.hardcodedPatches[patchName],
          enabled: !previous.hardcodedPatches[patchName].enabled,
        },
      },
    }))
  }

  const handleUpdateHardcodedExtensions = (patchName, value) => {
    const extensions = value
      .split(',')
      .map((extension) => extension.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean)

    setPatchState((previous) => ({
      ...previous,
      hardcodedPatches: {
        ...previous.hardcodedPatches,
        [patchName]: {
          ...previous.hardcodedPatches[patchName],
          extensions,
        },
      },
    }))
  }

  const handleToggleRule = (ruleKey) => {
    setPatchState((previous) => ({
      ...previous,
      rules: previous.rules.map((rule) => (
        rule.key === ruleKey ? { ...rule, enabled: !rule.enabled } : rule
      )),
    }))
  }

  const handleUpdateRule = (ruleKey, field, value) => {
    const updatedValue = field === 'extensions'
      ? value.split(',').map((extension) => extension.trim().replace(/^\./, '')).filter(Boolean)
      : value

    setPatchState((previous) => ({
      ...previous,
      rules: previous.rules.map((rule) => (
        rule.key === ruleKey ? { ...rule, [field]: updatedValue } : rule
      )),
    }))
  }

  const handleRemoveRule = (ruleKey) => {
    setPatchState((previous) => ({
      ...previous,
      rules: previous.rules.filter((rule) => rule.key !== ruleKey),
    }))
  }

  const updateRuleForm = (field, value) => {
    setRuleForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleAddRule = () => {
    if (!ruleForm.xpath) {
      return
    }

    const nextRule = { ...ruleForm }

    if (typeof nextRule.extensions === 'string') {
      nextRule.extensions = nextRule.extensions
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
    } else {
      nextRule.extensions = Array.isArray(nextRule.extensions) ? nextRule.extensions : []
    }

    if (nextRule.action === 'replace' || nextRule.action === 'replace-ancestor-attribute') {
      if (!nextRule.search && nextRule.action === 'replace') {
        return
      }
    }

    if (nextRule.action === 'set-text' && !nextRule.value) {
      return
    }

    const normalizedRule = {
      ...nextRule,
      enabled: true,
      key: `${Date.now()}-${nextRule.action}-${nextRule.xpath}`,
    }

    Object.keys(normalizedRule).forEach((key) => {
      if (normalizedRule[key] === '' || normalizedRule[key] === null || normalizedRule[key] === undefined) {
        delete normalizedRule[key]
      }
    })

    setPatchState((previous) => ({
      ...previous,
      rules: [...previous.rules, normalizedRule],
    }))
    setRuleForm(DEFAULT_RULE_FORM)
  }

  const handleDownloadRules = () => {
    const blob = new Blob([JSON.stringify(exportedConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'ples-iop-rules.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(commandPreview)
    } catch {
      // Quiet fallback: the value is still visible in the UI.
    }
  }

  const handleRunPatch = async () => {
    if (sourceFiles.length === 0) {
      setRunStatus('Select at least one input SCL file before running the patch.')
      return
    }

    setIsPatching(true)
    setPendingDownloads([])
    const patchedFiles = []
    const outputNameCounts = new Map()

    try {
      setRunStatus('Waking the backend service. Render may take up to a minute to resume after being idle…')
      const healthResponse = await fetch(`${PATCH_API_URL}/health`, { cache: 'no-store' })
      if (!healthResponse.ok) {
        throw new Error(`The patch service health check failed (${healthResponse.status}).`)
      }

      for (const [index, sourceFile] of sourceFiles.entries()) {
        setRunStatus(`Patching file ${index + 1} of ${sourceFiles.length}: ${sourceFile.name}`)

        const formData = new FormData()
        formData.append('file', sourceFile)
        formData.append('rules', JSON.stringify(exportedConfig))

        const response = await fetch(`${PATCH_API_URL}/patch`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const details = await response.text()
          throw new Error(`${sourceFile.name}: ${details || 'Patch service returned an error'}`)
        }

        const extension = sourceFile.name.match(/\.[^.]+$/)?.[0] || '.xml'
        const stem = sourceFile.name.replace(/\.[^.]+$/, '')
        const baseName = `${stem}_patched${extension}`
        const duplicateCount = outputNameCounts.get(baseName) ?? 0
        outputNameCounts.set(baseName, duplicateCount + 1)
        const outputName = duplicateCount === 0
          ? baseName
          : `${stem}_patched_${duplicateCount + 1}${extension}`
        patchedFiles.push({ fileName: outputName, blob: await response.blob() })
      }

      setPendingDownloads(patchedFiles)
      setRunStatus(`${patchedFiles.length} patched file(s) are ready. Choose a destination folder to save them.`)
    } catch (error) {
      setPendingDownloads(patchedFiles)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setRunStatus('Patching canceled.')
      } else {
        const detail = error instanceof Error ? error.message : 'Unable to patch the selected files.'
        setRunStatus(patchedFiles.length > 0
          ? `Patching stopped after ${patchedFiles.length} file(s). Completed files are ready to save. ${detail}`
          : detail)
      }
    } finally {
      setIsPatching(false)
    }
  }

  const handleSavePatchedFiles = async () => {
    if (pendingDownloads.length === 0) {
      return
    }

    if (typeof window.showDirectoryPicker !== 'function') {
      setRunStatus('Folder saving requires a browser that supports folder access, such as desktop Chrome or Edge.')
      return
    }

    try {
      const destinationDirectory = await window.showDirectoryPicker({ mode: 'readwrite' })

      for (const { fileName, blob } of pendingDownloads) {
        const outputHandle = await destinationDirectory.getFileHandle(fileName, { create: true })
        const writable = await outputHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }

      setRunStatus(`${pendingDownloads.length} patched file(s) saved in the selected folder.`)
      setPendingDownloads([])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setRunStatus('Folder selection canceled. Patched files are still ready to save.')
      } else {
        setRunStatus(error instanceof Error ? error.message : 'Unable to save the patched files.')
      }
    }
  }

  const renderRuleTextField = (rule, field, label, wide = false) => (
    <label className={`${wide ? 'md:col-span-2 ' : ''}text-xs uppercase tracking-widest text-slate-500`}>
      {label}
      <input
        value={rule[field] ?? ''}
        onChange={(event) => handleUpdateRule(rule.key, field, event.target.value)}
        className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
      />
    </label>
  )

  return (
    <section className="border border-slate-700 bg-slate-900 p-6">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Tool panel</p>
      <h2 className="text-2xl font-bold text-slate-100 mb-3">SCL patch runner</h2>
      <p className="text-sm text-slate-400 mb-6">
        Select an ICD, IID, or SCD file and tune the JSON-driven PLES patch set before generating the Python call.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <input
            ref={sourceInputRef}
            type="file"
            multiple
            accept=".icd,.iid,.scd,.xml"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              if (files.length > 0) {
                setSourceFiles(files)
                setPendingDownloads([])
                setRunStatus('')
              }
              event.target.value = ''
            }}
          />

          <button
            type="button"
            className={`border p-4 text-left transition-colors flex-1 ${
              sourceFiles.length > 0
                ? 'border-cyan-600 bg-cyan-950/20'
                : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
            }`}
            onClick={() => sourceInputRef.current?.click()}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-widest">SCL input files</span>
              {sourceFiles.length > 0 && <span className="text-xs text-cyan-400">{sourceFiles.length} selected</span>}
            </div>
            <p className="text-2xl font-bold text-slate-200">ICD / IID / SCD</p>
            {sourceFiles.length > 0 ? (
              <div className="mt-2 max-h-20 overflow-y-auto">
                {sourceFiles.map((file, index) => (
                  <p key={`${file.name}-${file.lastModified}-${index}`} className="text-xs text-cyan-400 truncate">{file.name}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 mt-1">Click to select one or more SCL files</p>
            )}
          </button>

          <button
            type="button"
            className="border border-cyan-500 bg-cyan-500 px-5 py-4 text-sm font-bold uppercase tracking-widest text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
            onClick={handleRunPatch}
            disabled={sourceFiles.length === 0 || isPatching}
          >
            {isPatching ? 'Patching…' : 'Run patch'}
          </button>
        </div>

        <div className="border border-slate-700 bg-slate-950/40 p-4 flex flex-col justify-between gap-3">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Patch selection summary</span>
          <div className="text-sm text-slate-300">
            <p>{Object.keys(patchState.hardcodedPatches).length} built-in patch(es)</p>
            <p>{patchState.rules.length} parameterized rule(s)</p>
          </div>
          <button
            type="button"
            className="w-full border border-cyan-500 bg-cyan-500 px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-950 hover:bg-cyan-300"
            onClick={handleDownloadRules}
          >
            Download updated rules JSON
          </button>
        </div>
      </div>

      {runStatus && (
        <div className="mb-6 border border-cyan-700 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-300">
          {runStatus}
          {pendingDownloads.length > 0 && (
            <button
              type="button"
              className="mt-3 block border border-cyan-500 bg-cyan-500 px-4 py-2 font-bold uppercase tracking-widest text-slate-950 hover:bg-cyan-300"
              onClick={handleSavePatchedFiles}
            >
              Choose output folder and save {pendingDownloads.length} file(s)
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300 mb-3">Built-in patches</h3>
          <div className="space-y-3">
            {Object.entries(patchState.hardcodedPatches).length === 0 ? (
              <p className="text-sm text-slate-500">Loading patch definitions…</p>
            ) : (
              Object.entries(patchState.hardcodedPatches).map(([patchName, setting]) => (
                <div key={patchName} className="flex items-start justify-between gap-3 border border-slate-700 bg-slate-900/80 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100">{patchName}</p>
                    <label className="mt-2 block text-[11px] uppercase tracking-widest text-slate-500">
                      Extensions
                      <input
                        type="text"
                        value={setting.extensions.join(', ')}
                        onChange={(event) => handleUpdateHardcodedExtensions(patchName, event.target.value)}
                        placeholder="All file types"
                        aria-label={`${patchName} extensions`}
                        className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-xs px-2 py-1"
                      />
                    </label>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(setting.enabled)}
                    onChange={() => handleToggleHardcodedPatch(patchName)}
                    className="h-4 w-4 accent-cyan-500"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300 mb-3">Parameterized rules</h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {patchState.rules.length === 0 ? (
              <p className="text-sm text-slate-500">No parameterized rules imported yet.</p>
            ) : (
              patchState.rules.map((rule) => (
                <div key={rule.key} className="border border-slate-700 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-widest text-slate-500">{rule.action}</p>
                      {rule.xpath && <p className="text-sm text-slate-200 break-all">{rule.xpath}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Enable ${rule.action} rule`}
                        type="checkbox"
                        checked={rule.enabled !== false}
                        onChange={() => handleToggleRule(rule.key)}
                        className="h-4 w-4 accent-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingRuleKey((currentKey) => currentKey === rule.key ? null : rule.key)}
                        className="text-xs uppercase tracking-widest text-cyan-300 hover:text-cyan-100"
                      >
                        {editingRuleKey === rule.key ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.key)}
                        className="text-xs uppercase tracking-widest text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {rule.search && <p className="text-xs text-slate-400">Search: {rule.search}</p>}
                  {rule.replace && <p className="text-xs text-slate-400">Replace: {rule.replace}</p>}
                  {rule.extensions?.length > 0 && (
                    <p className="text-xs text-slate-400">Extensions: {rule.extensions.join(', ')}</p>
                  )}
                  {editingRuleKey === rule.key && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-700 pt-3">
                      <label className="text-xs uppercase tracking-widest text-slate-500">
                        Action
                        <select
                          value={rule.action}
                          onChange={(event) => handleUpdateRule(rule.key, 'action', event.target.value)}
                          className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                        >
                          <option value="delete">delete</option>
                          <option value="replace">replace</option>
                          <option value="replace-ancestor-attribute">replace-ancestor-attribute</option>
                          <option value="set-text">set-text</option>
                          <option value="set-attribute">set-attribute</option>
                          <option value="add-attribute">add-attribute</option>
                          <option value="rename-data-type-template-id">rename-data-type-template-id</option>
                        </select>
                      </label>
                      <label className="text-xs uppercase tracking-widest text-slate-500">
                        Extensions
                        <input
                          value={(rule.extensions ?? []).join(', ')}
                          onChange={(event) => handleUpdateRule(rule.key, 'extensions', event.target.value)}
                          className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                          placeholder="icd, iid, scd"
                        />
                      </label>

                      {rule.action !== 'rename-data-type-template-id' && renderRuleTextField(rule, 'xpath', 'XPath', true)}

                      {rule.action === 'replace' && (
                        <>
                          <label className="text-xs uppercase tracking-widest text-slate-500">
                            Target
                            <select
                              value={rule.target ?? 'text'}
                              onChange={(event) => handleUpdateRule(rule.key, 'target', event.target.value)}
                              className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                            >
                              <option value="text">text</option>
                              <option value="attribute">attribute</option>
                            </select>
                          </label>
                          {rule.target === 'attribute' && renderRuleTextField(rule, 'attribute', 'Attribute name')}
                          {renderRuleTextField(rule, 'search', 'Search')}
                          {renderRuleTextField(rule, 'replace', 'Replace')}
                        </>
                      )}

                      {rule.action === 'replace-ancestor-attribute' && (
                        <>
                          {renderRuleTextField(rule, 'ancestor', 'Ancestor tag')}
                          {renderRuleTextField(rule, 'attribute', 'Attribute name')}
                          {renderRuleTextField(rule, 'replace', 'Replace')}
                        </>
                      )}

                      {rule.action === 'rename-data-type-template-id' && (
                        <>
                          {renderRuleTextField(rule, 'search', 'Search')}
                          {renderRuleTextField(rule, 'replace', 'Replace')}
                        </>
                      )}

                      {(rule.action === 'set-text' || rule.action === 'set-attribute' || rule.action === 'add-attribute') && (
                        <>
                          {renderRuleTextField(rule, 'value', 'Value')}
                          {(rule.action === 'set-attribute' || rule.action === 'add-attribute') &&
                            renderRuleTextField(rule, 'name', 'Attribute name')}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border border-slate-700 bg-slate-950/60 p-4 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300 mb-3">Add custom patch</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs uppercase tracking-widest text-slate-500">
            Action
            <select
              value={ruleForm.action}
              onChange={(event) => updateRuleForm('action', event.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
            >
              <option value="delete">delete</option>
              <option value="replace">replace</option>
              <option value="replace-ancestor-attribute">replace-ancestor-attribute</option>
              <option value="set-text">set-text</option>
              <option value="set-attribute">set-attribute</option>
              <option value="add-attribute">add-attribute</option>
              <option value="rename-data-type-template-id">rename-data-type-template-id</option>
            </select>
          </label>

          <label className="text-xs uppercase tracking-widest text-slate-500">
            Extensions
            <input
              value={ruleForm.extensions.join(', ')}
              onChange={(event) => updateRuleForm('extensions', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))}
              className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
              placeholder="icd, iid, scd"
            />
          </label>

          <label className="md:col-span-2 text-xs uppercase tracking-widest text-slate-500">
            XPath
            <input
              value={ruleForm.xpath}
              onChange={(event) => updateRuleForm('xpath', event.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
              placeholder="//*[local-name()='IED']"
            />
          </label>

          {(ruleForm.action === 'replace' || ruleForm.action === 'replace-ancestor-attribute') && (
            <>
              <label className="text-xs uppercase tracking-widest text-slate-500">
                Search
                <input
                  value={ruleForm.search}
                  onChange={(event) => updateRuleForm('search', event.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                />
              </label>

              <label className="text-xs uppercase tracking-widest text-slate-500">
                Replace
                <input
                  value={ruleForm.replace}
                  onChange={(event) => updateRuleForm('replace', event.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                />
              </label>
            </>
          )}

          {(ruleForm.action === 'set-text' || ruleForm.action === 'set-attribute' || ruleForm.action === 'add-attribute') && (
            <>
              <label className="text-xs uppercase tracking-widest text-slate-500">
                Value
                <input
                  value={ruleForm.value}
                  onChange={(event) => updateRuleForm('value', event.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                />
              </label>

              {ruleForm.action === 'set-attribute' || ruleForm.action === 'add-attribute' ? (
                <label className="text-xs uppercase tracking-widest text-slate-500">
                  Attribute name
                  <input
                    value={ruleForm.name}
                    onChange={(event) => updateRuleForm('name', event.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
                  />
                </label>
              ) : null}
            </>
          )}

          {ruleForm.action === 'replace-ancestor-attribute' && (
            <label className="text-xs uppercase tracking-widest text-slate-500">
              Ancestor tag
              <input
                value={ruleForm.ancestor}
                onChange={(event) => updateRuleForm('ancestor', event.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2"
              />
            </label>
          )}
        </div>

        <button
          type="button"
          className="mt-4 border border-cyan-500 bg-cyan-500 px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-950 hover:bg-cyan-300"
          onClick={handleAddRule}
        >
          Add rule to JSON set
        </button>
      </div>

      <div className="border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Python invocation</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <pre className="overflow-x-auto text-sm text-cyan-300 whitespace-pre-wrap break-words">{commandPreview}</pre>
          <button
            type="button"
            className="border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
            onClick={handleCopyCommand}
          >
            Copy command
          </button>
        </div>
      </div>

      {loadingError && (
        <div className="mt-4 border border-red-500 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
          ⚠ {loadingError}
        </div>
      )}
    </section>
  )
}
