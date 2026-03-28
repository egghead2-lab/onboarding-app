'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const TYPE_COLORS: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

const REQ_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  not_started:        { label: 'Not Started',        cls: 'bg-gray-100 text-gray-600' },
  instructions_sent:  { label: 'Instructions Sent',  cls: 'bg-blue-100 text-blue-700' },
  awaiting_candidate: { label: 'Awaiting Candidate', cls: 'bg-amber-100 text-amber-700' },
  action_needed:      { label: 'Action Needed',      cls: 'bg-red-100 text-red-700' },
}

type Req = {
  id: string
  due_date: string | null
  status: string | null
  completed: boolean
  requirement: { title: string; type: string } | null
  assignee: { full_name: string | null } | null
}

// keep for compat
type OverdueReq = Req & { due_date: string }

type TeamMember = { id: string; full_name: string | null; email: string }
type SheetData = {
  rows: { area: string; trainer: string; fieldManager: string; scheduler: string }[]
  trainers: string[]
  fieldManagers: string[]
  schedulers: string[]
}

export default function CandidateRow({
  candidate,
  teamMembers,
  areas,
  unreadCount,
  approaching,
  overdueRequirements = [],
  allRequirements = [],
}: {
  candidate: any
  teamMembers: TeamMember[]
  areas: string[]
  unreadCount: number
  approaching?: boolean
  overdueRequirements?: OverdueReq[]
  allRequirements?: Req[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(candidate.status)
  const [assignedTo, setAssignedTo] = useState(candidate.assigned_to ?? '')
  const [area, setArea] = useState(candidate.area ?? '')
  const [firstClassDate, setFirstClassDate] = useState(candidate.first_class_date ?? '')
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [showReqs, setShowReqs] = useState(false)

  useEffect(() => {
    fetch('/api/sheets').then((r) => r.json()).then(setSheetData)
  }, [])

  const href = `/admin/candidates/${candidate.id}`
  const availChanged = candidate.candidate_details?.[0]?.availability_changed
  const supabase = createClient()

  async function handleChange(field: string, value: string) {
    await supabase.from('candidates').update({ [field]: value || null }).eq('id', candidate.id)
  }

  async function handleAreaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setArea(val)
    const updates: Record<string, string | null> = { area: val || null }

    if (val && sheetData) {
      const match = sheetData.rows.find((r) => r.area === val)
      if (match) {
        updates.trainer = match.trainer
        updates.field_manager = match.fieldManager
        updates.scheduler = match.scheduler
      }
    }
    await supabase.from('candidates').update(updates).eq('id', candidate.id)
  }

  const cell = 'px-3 py-2'
  const select = 'text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white w-full'

  return (
  <>
    <tr className="hover:bg-blue-50 border-b border-gray-100">
      {/* Name */}
      <td className={cell}>
        <Link href={href} className="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1.5">
          {candidate.full_name}
          {approaching && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">date approaching</span>
          )}
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{unreadCount} new</span>
          )}
          {availChanged && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">avail. changed</span>
          )}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">{candidate.email}</p>
          {allRequirements.length > 0 && (
            <button
              onClick={() => setShowReqs(s => !s)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
            >
              <svg className={`w-3 h-3 transition-transform ${showReqs ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {overdueRequirements.length > 0
                ? <span className="text-red-500">{overdueRequirements.length} overdue</span>
                : <span>{allRequirements.filter(r => !r.completed).length} outstanding</span>
              }
            </button>
          )}
        </div>
      </td>

      {/* Area */}
      <td className={cell}>
        <select value={area} onChange={handleAreaChange} className={select}>
          <option value="">—</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </td>

      {/* Status */}
      <td className={cell}>
        <select
          value={status}
          onChange={async (e) => {
            const val = e.target.value
            setStatus(val)
            await handleChange('status', val)
            router.refresh()
          }}
          className={`${select} ${statusColors[status]}`}
        >
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
          <option value="rejected">Rejected/Resigned</option>
        </select>
      </td>

      {/* Assigned To */}
      <td className={cell}>
        <select
          value={assignedTo}
          onChange={(e) => { setAssignedTo(e.target.value); handleChange('assigned_to', e.target.value) }}
          className={select}
        >
          <option value="">—</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
      </td>

      {/* First Class Date */}
      <td className={cell}>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={firstClassDate}
            onChange={async (e) => {
              if (e.target.validity.valid || e.target.value === '') {
                const val = e.target.value
                setFirstClassDate(val)
                await handleChange('first_class_date', val)
                if (val) {
                  // Recalculate due dates for this candidate
                  const { data: candReqs } = await supabase
                    .from('candidate_requirements')
                    .select('id, requirement:requirement_id(due_offset_days)')
                    .eq('candidate_id', candidate.id)
                  for (const cr of candReqs ?? []) {
                    const offset = (cr.requirement as any)?.due_offset_days
                    if (offset == null) continue
                    const d = new Date(val)
                    d.setDate(d.getDate() + offset)
                    await supabase.from('candidate_requirements')
                      .update({ due_date: d.toISOString().split('T')[0] })
                      .eq('id', cr.id)
                  }
                }
              }
            }}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {!firstClassDate && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">missing</span>
          )}
        </div>
      </td>

      {/* View */}
      <td className={cell}>
        <Link href={href} className="text-blue-600 text-xs hover:underline">View →</Link>
      </td>
    </tr>

    {showReqs && allRequirements.map(req => {
      const reqStatus = req.status ?? 'not_started'
      const statusInfo = REQ_STATUS_LABELS[reqStatus] ?? REQ_STATUS_LABELS.not_started
      const today = new Date().toISOString().split('T')[0]
      const overdue = !req.completed && req.due_date && req.due_date < today
      const dueLabel = req.due_date
        ? new Date(req.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null
      return (
        <tr key={req.id} className={`border-b ${overdue ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          {/* Name col */}
          <td className="px-3 py-1.5 pl-8">
            <Link href={href} className="flex items-center gap-2">
              {overdue && <span className="text-xs text-red-400">⚠</span>}
              <span className={`text-xs font-medium truncate max-w-xs ${req.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {req.requirement?.title}
              </span>
            </Link>
          </td>
          {/* Area col — type badge */}
          <td className="px-3 py-1.5">
            {req.requirement?.type && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${TYPE_COLORS[req.requirement.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {req.requirement.type}
              </span>
            )}
          </td>
          {/* Status col */}
          <td className="px-3 py-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusInfo.cls}`}>{statusInfo.label}</span>
          </td>
          {/* Assigned To col */}
          <td className="px-3 py-1.5">
            <span className="text-xs text-gray-500">{req.assignee?.full_name ?? '—'}</span>
          </td>
          {/* Due date col */}
          <td className="px-3 py-1.5">
            {dueLabel && (
              <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                {overdue ? 'Due ' : ''}{dueLabel}
              </span>
            )}
          </td>
          <td />
        </tr>
      )
    })}
  </>
  )
}
