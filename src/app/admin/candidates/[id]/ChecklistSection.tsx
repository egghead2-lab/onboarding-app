'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentList from '@/components/DocumentList'
import Link from 'next/link'

type ChecklistItem = {
  id: string
  completed: boolean
  requirement_id: string
  due_date: string | null
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
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
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
  const [items, setItems] = useState(initialItems)
  const [showCompleted, setShowCompleted] = useState(false)
  const supabase = createClient()

  async function toggle(item: ChecklistItem) {
    const newCompleted = !item.completed
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: newCompleted } : i))
    await supabase.from('candidate_requirements').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      completed_by: newCompleted ? currentUserId : null,
    }).eq('id', item.id)
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
          const dueLabel = item.due_date
            ? new Date(item.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : null

          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2">
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
              <p className={`flex-1 text-sm min-w-0 truncate ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {item.requirement?.title}
              </p>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                {item.assignee?.full_name && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">{item.assignee.full_name}</span>
                )}
                {dueLabel && (
                  <span className={`text-xs whitespace-nowrap font-medium ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                    {overdue ? '⚠ ' : ''}{dueLabel}
                  </span>
                )}
                {item.requirement?.requires_document && (
                  <DocumentList docs={docs.filter(d => d.requirement_id === item.requirement_id)} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
