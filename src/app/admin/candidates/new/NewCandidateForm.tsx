'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

type SheetData = {
  rows: { area: string; trainer: string; fieldManager: string; scheduler: string }[]
  trainers: string[]
  fieldManagers: string[]
  schedulers: string[]
}

type TemplateItem = {
  id: string
  title: string
  description: string | null
  type: string
  due_offset_days: number | null
}

type Template = {
  id: string
  name: string
  is_universal: boolean
  items: TemplateItem[]
}

type DraftItem = {
  key: string  // unique within draft list
  title: string
  description: string | null
  type: string
  due_offset_days: number | null
  source: 'template' | 'custom'
}

const typeColors: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

function formatOffset(days: number | null) {
  if (days == null) return null
  if (days === 0) return 'On first class date'
  return days < 0 ? `${Math.abs(days)} days before` : `${days} days after`
}

export default function NewCandidateForm({
  areas,
  templates,
  action,
}: {
  areas: string[]
  templates: Template[]
  action: (formData: FormData) => Promise<void>
}) {
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [trainer, setTrainer] = useState('')
  const [fieldManager, setFieldManager] = useState('')
  const [scheduler, setScheduler] = useState('')
  const [loading, setLoading] = useState(false)

  // Template selection state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(
    new Set(templates.filter((t) => t.is_universal).map((t) => t.id))
  )
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set())
  const [customItems, setCustomItems] = useState<DraftItem[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customType, setCustomType] = useState('onboarding')
  const [customOffset, setCustomOffset] = useState('')
  const [customOffsetDir, setCustomOffsetDir] = useState('after')

  const hiddenItemsRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sheets').then((r) => r.json()).then(setSheetData)
  }, [])

  function handleAreaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const area = e.target.value
    if (!area || !sheetData) { setTrainer(''); setFieldManager(''); setScheduler(''); return }
    const match = sheetData.rows.find((r) => r.area === area)
    if (match) { setTrainer(match.trainer); setFieldManager(match.fieldManager); setScheduler(match.scheduler) }
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Restore any items that were removed from this template
    setRemovedKeys((prev) => {
      const template = templates.find((t) => t.id === id)
      if (!template) return prev
      const next = new Set(prev)
      template.items.forEach((item) => next.delete(item.id))
      return next
    })
  }

  // Keys of items from universal templates — these can't be removed
  const universalItemKeys = useMemo<Set<string>>(() => {
    const keys = new Set<string>()
    for (const t of templates.filter((t) => t.is_universal)) {
      for (const item of t.items) keys.add(item.title.toLowerCase())
    }
    return keys
  }, [templates])

  // Merged, deduplicated preview items from selected templates
  const templateItems = useMemo<DraftItem[]>(() => {
    const seen = new Set<string>()
    const result: DraftItem[] = []
    // Universal templates always first and always included
    for (const t of templates.filter((t) => t.is_universal)) {
      for (const item of t.items) {
        const dedupeKey = item.title.toLowerCase()
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        result.push({ key: item.id ?? item.title, title: item.title, description: item.description, type: item.type, due_offset_days: item.due_offset_days, source: 'template' })
      }
    }
    for (const id of selectedTemplateIds) {
      const template = templates.find((t) => t.id === id)
      if (!template || template.is_universal) continue
      for (const item of template.items) {
        const dedupeKey = item.title.toLowerCase()
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        result.push({ key: item.id ?? item.title, title: item.title, description: item.description, type: item.type, due_offset_days: item.due_offset_days, source: 'template' })
      }
    }
    return result
  }, [selectedTemplateIds, templates])

  const previewItems = useMemo(() => {
    return [...templateItems.filter((i) => !removedKeys.has(i.key)), ...customItems]
  }, [templateItems, removedKeys, customItems])

  function addCustomItem() {
    if (!customTitle.trim()) return
    const offset = customOffset ? (customOffsetDir === 'before' ? -Number(customOffset) : Number(customOffset)) : null
    setCustomItems((prev) => [...prev, {
      key: `custom-${Date.now()}`,
      title: customTitle.trim(),
      description: null,
      type: customType,
      due_offset_days: offset,
      source: 'custom',
    }])
    setCustomTitle('')
    setCustomOffset('')
    setShowCustomForm(false)
  }

  function removeItem(key: string, source: 'template' | 'custom') {
    if (source === 'template') setRemovedKeys((prev) => new Set([...prev, key]))
    else setCustomItems((prev) => prev.filter((i) => i.key !== key))
  }

  const selectClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (hiddenItemsRef.current) {
          hiddenItemsRef.current.value = JSON.stringify(previewItems.map(({ title, description, type, due_offset_days }) => ({ title, description, type, due_offset_days })))
        }
        setLoading(true)
      }}
      className="space-y-6"
    >
      <input type="hidden" name="items_json" ref={hiddenItemsRef} />

      {/* Candidate info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input name="full_name" required className={selectClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input name="email" type="email" required className={selectClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" className={selectClass} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
            <select name="area" onChange={handleAreaChange} className={selectClass}>
              <option value="">Select area...</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
              <select name="trainer" value={trainer} onChange={(e) => setTrainer(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {sheetData?.trainers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Manager</label>
              <select name="field_manager" value={fieldManager} onChange={(e) => setFieldManager(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {sheetData?.fieldManagers.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduler</label>
              <select name="scheduler" value={scheduler} onChange={(e) => setScheduler(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {sheetData?.schedulers.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Template selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Onboarding Templates</p>
          <p className="text-xs text-gray-500 mb-3">Select which templates to apply. Universal templates are pre-selected.</p>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No templates yet. <a href="/admin/templates" className="text-blue-600 hover:underline">Create one first.</a></p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <label key={t.id} className={`flex items-center gap-3 ${t.is_universal ? 'cursor-default' : 'cursor-pointer'} group`}>
                  <input
                    type="checkbox"
                    checked={t.is_universal || selectedTemplateIds.has(t.id)}
                    onChange={() => !t.is_universal && toggleTemplate(t.id)}
                    disabled={t.is_universal}
                    className="rounded border-gray-300 disabled:opacity-60"
                  />
                  <span className="text-sm text-gray-800">{t.name}</span>
                  {t.is_universal && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">★ Always applied</span>
                  )}
                  <span className="text-xs text-gray-400">{t.items.length} items</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Requirements for this candidate ({previewItems.length})
            </p>
            <button type="button" onClick={() => setShowCustomForm((v) => !v)}
              className="text-xs text-blue-600 hover:underline">
              + Add custom item
            </button>
          </div>

          {showCustomForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3 space-y-2">
              <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Requirement title *"
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-2">
                <select value={customType} onChange={(e) => setCustomType(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="onboarding">Onboarding</option>
                  <option value="training">Training</option>
                </select>
                <div className="flex gap-1">
                  <input value={customOffset} onChange={(e) => setCustomOffset(e.target.value)}
                    type="number" min="0" placeholder="Days"
                    className="w-16 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={customOffsetDir} onChange={(e) => setCustomOffsetDir(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="before">days before</option>
                    <option value="after">days after</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addCustomItem}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700">Add</button>
                <button type="button" onClick={() => setShowCustomForm(false)}
                  className="text-gray-500 px-3 py-1.5 rounded-md text-xs hover:bg-gray-100">Cancel</button>
              </div>
            </div>
          )}

          {previewItems.length === 0 ? (
            <p className="text-sm text-gray-400">No requirements selected. Choose a template or add custom items.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-md">
              {previewItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800">{item.title}</span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[item.type]}`}>{item.type}</span>
                      {formatOffset(item.due_offset_days) && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{formatOffset(item.due_offset_days)}</span>
                      )}
                      {item.source === 'custom' && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">custom</span>
                      )}
                    </div>
                  </div>
                  {universalItemKeys.has(item.title.toLowerCase()) ? (
                    <span className="text-xs text-blue-400 flex-shrink-0" title="Universal — always applied">★</span>
                  ) : (
                    <button type="button" onClick={() => removeItem(item.key, item.source)}
                      className="text-gray-300 hover:text-red-500 text-sm leading-none flex-shrink-0">✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Adding...' : 'Add Candidate'}
        </button>
        <a href="/admin/candidates" className="px-4 py-2 text-sm text-gray-600 hover:underline">Cancel</a>
      </div>
    </form>
  )
}
