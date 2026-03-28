'use client'

import { useState } from 'react'

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

export default function SendEmailPanel({
  candidateId,
  candidateEmail,
  candidateName,
  gmailConnected,
  existingThreadId,
  emailTemplates = [],
  initialSubject,
  initialBody,
}: {
  candidateId: string
  candidateEmail: string
  candidateName: string
  gmailConnected: boolean
  existingThreadId?: string | null
  emailTemplates?: EmailTemplate[]
  initialSubject?: string
  initialBody?: string
}) {
  const [open, setOpen] = useState(!!(initialSubject || initialBody))
  const [subject, setSubject] = useState(initialSubject ?? '')
  const [body, setBody] = useState(initialBody ?? '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!gmailConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p className="text-yellow-800 font-medium mb-1">Gmail not connected</p>
        <p className="text-yellow-700 mb-2">Connect your Gmail to send emails to candidates.</p>
        <a href="/auth/gmail" className="text-blue-600 hover:underline">Connect Gmail →</a>
      </div>
    )
  }

  function applyTemplate(t: EmailTemplate) {
    setSubject(applyVars(t.subject, candidateName, candidateEmail))
    setBody(applyVars(t.body, candidateName, candidateEmail))
    setOpen(true)
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)

    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: candidateEmail,
        subject,
        body,
        candidateId,
        threadId: existingThreadId ?? null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to send')
    } else {
      setSent(true)
      setOpen(false)
      setSubject('')
      setBody('')
    }
    setSending(false)
  }

  return (
    <div>
      {sent && (
        <p className="text-sm text-green-600 mb-2">Email sent to {candidateEmail}</p>
      )}
      {!open ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setOpen(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Send Email
          </button>
          {emailTemplates.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="bg-white border border-gray-200 text-blue-600 px-3 py-2 rounded-md text-sm hover:bg-blue-50"
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">To: {candidateName} &lt;{candidateEmail}&gt;</p>
            <div className="flex items-center gap-3">
              {emailTemplates.length > 0 && (
                <select
                  onChange={(e) => {
                    const t = emailTemplates.find(t => t.id === e.target.value)
                    if (t) applyTemplate(t)
                    e.target.value = ''
                  }}
                  defaultValue=""
                  className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="" disabled>Use template…</option>
                  {emailTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message..."
            rows={5}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline px-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
