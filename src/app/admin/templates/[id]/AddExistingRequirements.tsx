'use client'

import { useState } from 'react'

type Requirement = {
  id: string
  title: string
  description: string | null
  type: string
  due_offset_days: number | null
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

export default function AddExistingRequirements({
  templateId,
  requirements,
  addAction,
}: {
  templateId: string
  requirements: Requirement[]
  addAction: (formData: FormData) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'training'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const grouped = {
    onboarding: requirements.filter((r) => r.type === 'onboarding'),
    training: requirements.filter((r) => r.type === 'training'),
  }

  const visible = filter === 'all'
    ? requirements
    : requirements.filter((r) => r.type === filter)

  const visibleByType = {
    onboarding: visible.filter((r) => r.type === 'onboarding'),
    training: visible.filter((r) => r.type === 'training'),
  }

  function toggleAll(type: 'onboarding' | 'training') {
    const ids = (type === 'onboarding' ? visibleByType.onboarding : visibleByType.training).map((r) => r.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-white border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 text-left"
        >
          + Add from existing requirements ({requirements.length} available)
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Add from Existing Requirements</h2>
        <button type="button" onClick={() => { setOpen(false); setSelected(new Set()) }}
          className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {requirements.length === 0 ? (
        <p className="text-sm text-gray-400">All existing requirements are already in this template.</p>
      ) : (
        <form action={addAction}>
          <input type="hidden" name="template_id" value={templateId} />
          {/* Selected ids as hidden inputs */}
          {Array.from(selected).map((id) => (
            <input key={id} type="hidden" name="req_ids" value={id} />
          ))}

          {/* Type filter tabs */}
          <div className="flex gap-1 mb-4">
            {(['all', 'onboarding', 'training'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? `All (${requirements.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${grouped[f].length})`}
              </button>
            ))}
          </div>

          {/* Requirements grouped by type */}
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {(['onboarding', 'training'] as const).map((type) => {
              const items = visibleByType[type]
              if (!items.length) return null
              const allChecked = items.every((r) => selected.has(r.id))
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[type]}`}>
                      {type}
                    </span>
                    <button type="button" onClick={() => toggleAll(type)}
                      className="text-xs text-gray-400 hover:text-gray-600">
                      {allChecked ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {items.map((req) => (
                      <label key={req.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(req.id)}
                          onChange={() => setSelected((prev) => {
                            const next = new Set(prev)
                            next.has(req.id) ? next.delete(req.id) : next.add(req.id)
                            return next
                          })}
                          className="mt-0.5 rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{req.title}</p>
                          {req.description && <p className="text-xs text-gray-500">{req.description}</p>}
                          {formatOffset(req.due_offset_days) && (
                            <p className="text-xs text-gray-400">{formatOffset(req.due_offset_days)}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
            <button
              type="submit"
              disabled={selected.size === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add {selected.size > 0 ? `${selected.size} ` : ''}selected
            </button>
            <span className="text-xs text-gray-400">{selected.size} selected</span>
          </div>
        </form>
      )}
    </div>
  )
}
