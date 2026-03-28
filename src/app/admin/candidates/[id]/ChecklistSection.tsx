'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentList from '@/components/DocumentList'
import Link from 'next/link'

const TYPE_COLORS: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training:   'bg-green-100 text-green-700',
}

const REQ_STATUSES = [
  { value: 'not_started',        label: 'Not Started',        cls: 'bg-gray-100 text-gray-600' },
  { value: 'instructions_sent',  label: 'Instructions Sent',  cls: 'bg-blue-100 text-blue-700' },
  { value: 'awaiting_candidate', label: 'Awaiting Candidate', cls: 'bg-amber-100 text-amber-700' },
  { value: 'action_needed',      label: 'Action Needed',      cls: 'bg-red-100 text-red-700' },
]

function statusCls(value: string) {
  return REQ_STATUSES.find(s => s.value === value)?.cls ?? REQ_STATUSES[0].cls
}

type TeamMember = { id: string; full_name: string | null; email: string; staff_role: string | null }

type ChecklistItem = {
  id: string
  completed: boolean
  requirement_id: string
  due_date: string | null
  status: string | null
  assigned_to: string | null
  assignee: { full_name: string | null } | null
  requirement: {
    title: string
    type: string | null
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

type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  requirement_id: string | null
}

function applyVars(text: string, candidateName: string, candidateEmail: string) {
  return text
    .replace(/\{\{candidate_name\}\}/g, candidateName)
    .replace(/\{\{candidate_email\}\}/g, candidateEmail)
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

type InlineEmail = { subject: string; body: string }

export default function ChecklistSection({
  initialItems,
  docs,
  candidateId,
  candidateName,
  candidateEmail,
  gmailConnected,
  currentUserId,
  teamMembers,
  emailTemplates = [],
}: {
  initialItems: ChecklistItem[]
  docs: Doc[]
  candidateId: string
  candidateName: string
  candidateEmail: string
  gmailConnected: boolean
  currentUserId: string
  teamMembers: TeamMember[]
  emailTemplates?: EmailTemplate[]
}) {
  const [items, setItems] = useState(() => sortByUrgency(initialItems))
  const [showCompleted, setShowCompleted] = useState(false)
  const [inlineEmail, setInlineEmail] = useState<{ itemId: string } & InlineEmail | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
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

  async function updateAssignee(item: ChecklistItem, assigned_to: string | null) {
    const member = teamMembers.find(m => m.id === assigned_to) ?? null
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, assigned_to, assignee: member ? { full_name: member.full_name } : null } : i))
    await supabase.from('candidate_requirements').update({ assigned_to }).eq('id', item.id)
  }

  async function sendInlineEmail() {
    if (!inlineEmail) return
    setEmailSending(true)
    setEmailError(null)
    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: candidateEmail, subject: inlineEmail.subject, body: inlineEmail.body, candidateId }),
    })
    if (!res.ok) {
      const data = await res.json()
      setEmailError(data.error ?? 'Failed to send')
    } else {
      setEmailSent(inlineEmail.itemId)
      setInlineEmail(null)
    }
    setEmailSending(false)
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
        {/* Header */}
        <div className="grid items-center gap-3 px-4 py-1.5 bg-gray-50 rounded-t-lg" style={{ gridTemplateColumns: '1rem 1fr 5rem 10rem 7rem 6.5rem 1.5rem' }}>
          <div />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Requirement</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Type</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned To</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Due</span>
          <div />
        </div>

        {visible.map(item => {
          const overdue = isOverdue(item.due_date) && !item.completed
          const currentStatus = item.status ?? 'not_started'
          const type = item.requirement?.type ?? ''
          const linkedTemplate = emailTemplates.find(t => t.requirement_id === item.requirement_id)
          const isEmailOpen = inlineEmail?.itemId === item.id
          return (
            <div key={item.id}>
              <div className="grid items-center gap-3 px-4 py-1.5" style={{ gridTemplateColumns: '1rem 1fr 5rem 10rem 7rem 6.5rem 1.5rem' }}>
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
                {type ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize w-fit ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-500'}`}>{type}</span>
                ) : (
                  <span />
                )}
                <select
                  value={currentStatus}
                  onChange={e => updateStatus(item, e.target.value)}
                  className={`text-xs font-medium rounded-md px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusCls(currentStatus)}`}
                >
                  {REQ_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <select
                  value={item.assigned_to ?? ''}
                  onChange={e => updateAssignee(item, e.target.value || null)}
                  className="text-xs bg-transparent border-0 p-0 w-full cursor-pointer focus:outline-none text-gray-500 truncate"
                >
                  <option value="">—</option>
                  {(type === 'onboarding'
                    ? teamMembers.filter(m => m.staff_role === 'onboarder')
                    : type === 'training'
                    ? teamMembers.filter(m => m.staff_role === 'trainer')
                    : teamMembers
                  ).map(m => (
                    <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  {overdue && <span className="text-red-500 text-xs">⚠</span>}
                  <input
                    type="date"
                    value={item.due_date ?? ''}
                    onChange={e => updateDueDate(item, e.target.value || null)}
                    className={`text-xs font-medium bg-transparent border-0 p-0 w-full cursor-pointer focus:outline-none ${overdue ? 'text-red-600' : 'text-gray-400'}`}
                  />
                </div>
                <div className="flex items-center justify-center">
                  {linkedTemplate && gmailConnected && (
                    <button
                      title={`Send: ${linkedTemplate.name}`}
                      onClick={() => {
                        if (isEmailOpen) {
                          setInlineEmail(null)
                        } else {
                          setInlineEmail({
                            itemId: item.id,
                            subject: applyVars(linkedTemplate.subject, candidateName, candidateEmail),
                            body: applyVars(linkedTemplate.body, candidateName, candidateEmail),
                          })
                          setEmailError(null)
                        }
                      }}
                      className={`text-sm leading-none transition-colors ${isEmailOpen ? 'text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
                    >
                      ✉
                    </button>
                  )}
                  {emailSent === item.id && (
                    <span className="text-green-500 text-xs">✓</span>
                  )}
                </div>
              </div>

              {isEmailOpen && (
                <div className="px-4 pb-3 space-y-2 border-t border-blue-100 bg-blue-50">
                  <p className="text-xs font-medium text-blue-700 pt-2">Send email to {candidateName}</p>
                  <input
                    value={inlineEmail!.subject}
                    onChange={e => setInlineEmail(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                    placeholder="Subject"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <textarea
                    value={inlineEmail!.body}
                    onChange={e => setInlineEmail(prev => prev ? { ...prev, body: e.target.value } : prev)}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={sendInlineEmail}
                      disabled={emailSending || !inlineEmail?.subject.trim() || !inlineEmail?.body.trim()}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {emailSending ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      onClick={() => setInlineEmail(null)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
