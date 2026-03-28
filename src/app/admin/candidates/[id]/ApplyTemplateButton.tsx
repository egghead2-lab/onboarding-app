'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Template = {
  id: string
  name: string
  is_universal: boolean
  area: string | null
  items: { title: string; description: string | null; type: string; due_offset_days: number | null }[]
}

type AppliedHistory = { id: string; name: string; appliedAt: string }

const typeColors: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

export default function ApplyTemplateButton({
  candidateId,
  candidateArea,
  templates,
  appliedTemplateIds,
  appliedHistory,
  applyAction,
}: {
  candidateId: string
  candidateArea: string | null
  templates: Template[]
  appliedTemplateIds: Set<string>
  appliedHistory: AppliedHistory[]
  applyAction: (candidateId: string, templateId: string) => Promise<{ added: number; skipped: number; alreadyApplied: boolean; templateName: string }>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number; alreadyApplied: boolean; templateName: string } | null>(null)

  const areaTemplate = templates.find((t) => t.area && candidateArea && t.area === candidateArea)
  const otherTemplates = templates.filter((t) => t !== areaTemplate)
  const selectedTemplate = templates.find((t) => t.id === selected)

  async function handleApply() {
    if (!selected) return
    setLoading(true)
    const res = await applyAction(candidateId, selected)
    setResult(res)
    setLoading(false)
    if (!res.alreadyApplied) router.refresh()
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          + Apply template
        </button>
        {appliedHistory.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {appliedHistory.map((a) => (
              <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {a.name}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Apply Onboarding Template</p>
        <button type="button" onClick={() => { setOpen(false); setSelected(null); setResult(null) }}
          className="text-xs text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Applied history */}
      {appliedHistory.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-gray-100">
          <span className="text-xs text-gray-400">Already applied:</span>
          {appliedHistory.map((a) => (
            <span key={a.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">✓ {a.name}</span>
          ))}
        </div>
      )}

      {result ? (
        <div className="text-sm">
          {result.alreadyApplied ? (
            <p className="text-amber-700">"{result.templateName}" was already applied to this candidate.</p>
          ) : (
            <p className="text-green-700 font-medium">
              Done — {result.added} requirement{result.added !== 1 ? 's' : ''} added
              {result.skipped > 0 ? `, ${result.skipped} already present` : ''}.
            </p>
          )}
          <button type="button" onClick={() => { setSelected(null); setResult(null) }}
            className="text-xs text-blue-600 hover:underline mt-1">Apply another</button>
        </div>
      ) : (
        <>
          {areaTemplate && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Suggested for {candidateArea}</p>
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${selected === areaTemplate.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="template" value={areaTemplate.id} checked={selected === areaTemplate.id}
                  onChange={() => setSelected(areaTemplate.id)} className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900">{areaTemplate.name}</p>
                    {appliedTemplateIds.has(areaTemplate.id) && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">✓ applied</span>}
                  </div>
                  <p className="text-xs text-gray-500">{areaTemplate.items.length} items</p>
                </div>
              </label>
            </div>
          )}

          {otherTemplates.length > 0 && (
            <div>
              {areaTemplate && <p className="text-xs font-medium text-gray-500 mb-1.5">Other templates</p>}
              <div className="space-y-1.5">
                {otherTemplates.map((t) => (
                  <label key={t.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${selected === t.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="template" value={t.id} checked={selected === t.id}
                      onChange={() => setSelected(t.id)} className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        {t.is_universal && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Universal</span>}
                        {t.area && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.area}</span>}
                        {appliedTemplateIds.has(t.id) && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">✓ applied</span>}
                      </div>
                      <p className="text-xs text-gray-500">{t.items.length} items</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedTemplate && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview — {selectedTemplate.items.length} items</p>
              {appliedTemplateIds.has(selectedTemplate.id) && (
                <p className="text-xs text-amber-600 mb-2">⚠ This template has already been applied. Applying again will skip existing requirements.</p>
              )}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedTemplate.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${typeColors[item.type]}`}>{item.type}</span>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={handleApply} disabled={!selected || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed w-full">
            {loading ? 'Applying...' : 'Apply Template'}
          </button>
        </>
      )}
    </div>
  )
}
