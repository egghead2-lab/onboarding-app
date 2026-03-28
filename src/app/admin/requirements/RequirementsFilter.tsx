'use client'

import { useState, useMemo } from 'react'
import RequirementRow from './RequirementRow'

type Template = { id: string; name: string; is_universal: boolean; area: string | null }
type Req = any

export default function RequirementsFilter({
  requirements,
  templates,
  moveAction,
  updateAction,
  deleteAction,
}: {
  requirements: Req[]
  templates: Template[]
  moveAction: (fd: FormData) => Promise<void>
  updateAction: (fd: FormData) => Promise<void>
  deleteAction: (fd: FormData) => Promise<void>
}) {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return requirements
    if (activeFilter === 'unspecified') return requirements.filter((r: Req) => !r.template_id)
    return requirements.filter((r: Req) => r.template_id === activeFilter)
  }, [requirements, activeFilter])

  const grouped = {
    onboarding: filtered.filter((r: Req) => r.type === 'onboarding'),
    training: filtered.filter((r: Req) => r.type === 'training'),
  }

  // Count per filter
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: requirements.length, unspecified: 0 }
    for (const r of requirements) {
      if (!r.template_id) map.unspecified = (map.unspecified ?? 0) + 1
      else map[r.template_id] = (map[r.template_id] ?? 0) + 1
    }
    return map
  }, [requirements])

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'unspecified', label: 'Unspecified' },
    ...templates.map(t => ({
      key: t.id,
      label: `${t.is_universal ? '★ ' : ''}${t.name}${t.area ? ` (${t.area})` : ''}`,
    })),
  ]

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {counts[tab.key] !== undefined && (
              <span className={`ml-1 ${activeFilter === tab.key ? 'text-gray-300' : 'text-gray-400'}`}>
                {counts[tab.key] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400">No requirements in this category.</p>
      )}

      {(['onboarding', 'training'] as const).map((type) => (
        grouped[type].length > 0 && (
          <div key={type} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">{type}</h2>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {grouped[type].map((req: Req, i: number) => (
                <RequirementRow
                  key={req.id}
                  req={req}
                  templates={templates}
                  isFirst={i === 0}
                  isLast={i === grouped[type].length - 1}
                  moveAction={moveAction}
                  updateAction={updateAction}
                  deleteAction={deleteAction}
                />
              ))}
            </div>
          </div>
        )
      ))}
    </>
  )
}
