'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentList from '@/components/DocumentList'
import Link from 'next/link'

const REQ_STATUSES = [
  { value: 'not_started',        label: 'Not Started',        cls: 'bg-gray-100 text-gray-600' },
  { value: 'instructions_sent',  label: 'Instructions Sent',  cls: 'bg-blue-100 text-blue-700' },
  { value: 'awaiting_candidate', label: 'Awaiting Candidate', cls: 'bg-amber-100 text-amber-700' },
  { value: 'action_needed',      label: 'Action Needed',      cls: 'bg-red-100 text-red-700' },
]

function statusCls(value: string) {
  return REQ_STATUSES.find(s => s.value === value)?.cls ?? REQ_STATUSES[0].cls
}

type ChecklistItem = {
  id: string
  completed: boolean
  requirement_id: string
  due_date: string | null
  status: string | null
  assignee: { full_name: string | null } | null
  requirement: {
    title: string
    description: string | null
    requires_document: boolean
  } | null
}

type Doc = {
  id: string
  requirement_id: string | null
  signedUrl: string | null
  file_name: string
  storage_path: string
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

function sortByUrgency(items: ChecklistItem[]) {
  return [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

export default function ChecklistSection({
  initialItems,
  docs,
  candidateId,
  currentUserId,
}: {
  initialItems: ChecklistItem[]
  docs: Doc[]
  candidateId: string
  currentUserId: string
}) {
  const [items, setItems] = useState(() => sortByUrgency(initialItems))
  const [showCompleted, setShowCompleted] = useState(false)
  const supabase = createClient()

  async function toggle(item: ChecklistItem) {
    const newCompleted = !item.completed
    setItems(prev => sortByUrgency(prev.map(i => i.id === item.id ? { ...i, completed: newCompleted } : i)))
    await supabase.from('candidate_requirements').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      completed_by: newCompleted ? currentUserId : null,
    }).eq('id', item.id)
  }

  async function updateStatus(item: ChecklistItem, status: string) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i))
    await supabase.from('candidate_requirements').update({ status }).eq('id', item.id)
  }

  async function updateDueDate(item: ChecklistItem, due_date: string | null) {
    setItems(prev => sortByUrgency(prev.map(i => i.id === item.id ? { ...i, due_date } : i)))
    await supabase.from('candidate_requirements').update({ due_date }).eq('id', item.id)
  }

  const outstanding = items.filter(i => !i.completed)
  const completed = items.filter(i => i.completed)
  const visible = showCompleted ? items : outstanding

  if (!items.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        No requirements found. <Link href="/admin/requirements" className="text-blue-600 hover:underline">Add some requirements first.</Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Requirements</h2>
        <div className="flex items-center gap-3">
          {completed.length > 0 && (
            <button onClick={() => setShowCompleted(s => !s)} className="text-xs text-gray-400 hover:text-gray-600">
              {showCompleted ? 'Hide completed' : `Show ${completed.length} completed`}
            </button>
          )}
          <span className="text-sm text-gray-500">{completed.length}/{items.length} complete</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {visible.map(item => {
          const overdue = isOverdue(item.due_date) && !item.completed
          const currentStatus = item.status ?? 'not_started'
          return (
            <div key={item.id} className="grid items-center gap-3 px-4 py-1.5" style={{ gridTemplateColumns: '1rem 1fr 10rem 7rem 6.5rem' }}>
              <button
                onClick={() => toggle(item)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
              >
                {item.completed && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <p className={`text-sm truncate ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {item.requirement?.title}
                {item.requirement?.requires_document && (
                  <DocumentList docs={docs.filter(d => d.requirement_id === item.requirement_id)} />
                )}
              </p>
              <select
                value={currentStatus}
                onChange={e => updateStatus(item, e.target.value)}
                className={`text-xs font-medium rounded-md px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusCls(currentStatus)}`}
              >
                {REQ_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 truncate">{item.assignee?.full_name ?? ''}</span>
              <div className="flex items-center gap-1">
                {overdue && <span className="text-red-500 text-xs">⚠</span>}
                <input
                  type="date"
                  value={item.due_date ?? ''}
                  onChange={e => updateDueDate(item, e.target.value || null)}
                  className={`text-xs font-medium bg-transparent border-0 p-0 w-full cursor-pointer focus:outline-none ${overdue ? 'text-red-600' : 'text-gray-400'}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
