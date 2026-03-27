'use client'

import { useEffect, useState } from 'react'

type EmailMessage = {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  body: string
  internalDate: string
}

export default function EmailThread({
  candidateId,
  candidateEmail,
  candidateName,
  gmailConnected,
}: {
  candidateId: string
  candidateEmail: string
  candidateName: string
  gmailConnected: boolean
}) {
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [connectedEmail, setConnectedEmail] = useState<string>('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [composing, setComposing] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function loadMessages(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    fetch(`/api/gmail/threads?candidateId=${candidateId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setConnectedEmail(data.connectedEmail ?? '')
      })
      .finally(() => {
        setInitialLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    if (!gmailConnected) { setInitialLoading(false); return }
    loadMessages()
  }, [candidateId])

  const existingThreadId = messages[messages.length - 1]?.threadId ?? null
  const existingSubject = messages[messages.length - 1]?.subject ?? ''

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)

    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: candidateEmail,
        subject: existingThreadId ? existingSubject : (subject || `Message for ${candidateName}`),
        body,
        candidateId,
        threadId: existingThreadId,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to send')
      setSending(false)
      return
    }

    // Refresh thread
    const updated = await fetch(`/api/gmail/threads?candidateId=${candidateId}`).then(r => r.json())
    setMessages(updated.messages ?? [])
    setBody('')
    setSubject('')
    setComposing(false)
    setSending(false)
  }

  if (!gmailConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p className="text-yellow-800 font-medium mb-1">Gmail not connected</p>
        <p className="text-yellow-700 mb-2">Connect your Gmail to send and view emails.</p>
        <a href="/auth/gmail" className="text-blue-600 hover:underline">Connect Gmail →</a>
      </div>
    )
  }

  return (
    <div>
      {/* Thread messages */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => loadMessages(true)}
          disabled={refreshing}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>
      {initialLoading && <p className="text-sm text-gray-400 mb-3">Loading emails...</p>}
      {!initialLoading && messages.length === 0 && <p className="text-sm text-gray-400 mb-3">No emails yet.</p>}

      {messages.length > 0 && (
        <div className="space-y-3 mb-4">
          {messages.map(msg => {
            const isOutbound = connectedEmail
              ? msg.from.toLowerCase().includes(connectedEmail.toLowerCase())
              : false
            const displayDate = new Date(msg.date).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-3 ${isOutbound ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                  <div className={`flex items-center gap-2 mb-1 text-xs ${isOutbound ? 'text-blue-100' : 'text-gray-400'}`}>
                    <span className="font-medium">{isOutbound ? 'You' : candidateName}</span>
                    <span>·</span>
                    <span>{displayDate}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.body.trim()}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Compose / Reply */}
      {!composing ? (
        <button
          onClick={() => setComposing(true)}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          {messages.length > 0 ? 'Reply' : 'Send Email'}
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              To: {candidateName} &lt;{candidateEmail}&gt;
            </p>
            <button onClick={() => setComposing(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          {!existingThreadId && (
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Message..."
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button onClick={() => setComposing(false)} className="text-sm text-gray-500 hover:underline px-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
