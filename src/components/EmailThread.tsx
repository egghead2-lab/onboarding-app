'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import RichTextEditor from './RichTextEditor'

type EmailMessage = {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  text: string
  html: string
  internalDate: string
}

type EmailThreadGroup = {
  threadId: string
  subject: string
  messages: EmailMessage[]
}

function HtmlBody({ html, text }: { html: string; text: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    // Auto-resize
    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px'
      }
    }
    iframe.onload = resize
    resize()
  }, [html])

  if (!html) return <p className="text-sm whitespace-pre-wrap">{text.trim()}</p>

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      className="w-full border-0 min-h-[60px]"
      title="email"
    />
  )
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
  const [threads, setThreads] = useState<EmailThreadGroup[]>([])
  const [connectedEmail, setConnectedEmail] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [composing, setComposing] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function loadThreads(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    fetch(`/api/gmail/threads?candidateId=${candidateId}`)
      .then(r => r.json())
      .then(data => {
        const incoming: EmailThreadGroup[] = data.threads ?? []
        setThreads(incoming)
        setConnectedEmail(data.connectedEmail ?? '')
        // Auto-expand the most recent thread
        if (incoming.length > 0) {
          setExpandedThreads(new Set([incoming[0].threadId]))
        }
      })
      .finally(() => {
        setInitialLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    if (!gmailConnected) { setInitialLoading(false); return }
    loadThreads()
  }, [candidateId])

  function toggleThread(threadId: string) {
    setExpandedThreads(prev => {
      const next = new Set(prev)
      if (next.has(threadId)) next.delete(threadId)
      else next.add(threadId)
      return next
    })
  }

  function startReply(threadId: string, threadSubject: string) {
    setReplyTo(threadId)
    setSubject(threadSubject.startsWith('Re:') ? threadSubject : `Re: ${threadSubject}`)
    setComposing(true)
  }

  function startNewEmail() {
    setReplyTo(null)
    setSubject('')
    setComposing(true)
  }

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)

    const fd = new FormData()
    fd.append('to', candidateEmail)
    fd.append('subject', subject || `Message for ${candidateName}`)
    fd.append('body', body)
    fd.append('candidateId', candidateId)
    if (replyTo) fd.append('threadId', replyTo)
    for (const file of attachments) fd.append('attachments', file)

    const res = await fetch('/api/gmail/send', { method: 'POST', body: fd })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to send')
      setSending(false)
      return
    }

    setBody('')
    setSubject('')
    setAttachments([])
    setComposing(false)
    setReplyTo(null)
    loadThreads(true)
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
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={startNewEmail}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          + New Email
        </button>
        <button
          onClick={() => loadThreads(true)}
          disabled={refreshing}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Compose / Reply form */}
      {composing && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              To: {candidateName} &lt;{candidateEmail}&gt;
            </p>
            <button onClick={() => { setComposing(false); setReplyTo(null) }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <RichTextEditor onChange={setBody} placeholder="Message..." />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((f, i) => (
                <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {f.name}
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => {
              if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
              e.target.value = ''
            }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-gray-400 hover:text-gray-600"
              title="Attach files"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button onClick={() => { setComposing(false); setReplyTo(null) }} className="text-sm text-gray-500 hover:underline px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Thread list */}
      {initialLoading && <p className="text-sm text-gray-400">Loading emails...</p>}
      {!initialLoading && threads.length === 0 && <p className="text-sm text-gray-400">No emails yet.</p>}

      <div className="space-y-2">
        {threads.map(thread => {
          const isExpanded = expandedThreads.has(thread.threadId)
          const lastMsg = thread.messages[thread.messages.length - 1]
          const lastDate = new Date(lastMsg.date).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })

          return (
            <div key={thread.threadId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Thread header */}
              <button
                onClick={() => toggleThread(thread.threadId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{thread.subject || '(no subject)'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} · {lastDate}</p>
                </div>
                <span className="text-gray-400 ml-3 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Messages */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {thread.messages.map(msg => {
                    const isOutbound = connectedEmail
                      ? msg.from.toLowerCase().includes(connectedEmail.toLowerCase())
                      : false
                    const displayDate = new Date(msg.date).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                    })
                    return (
                      <div key={msg.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            {isOutbound ? `You → ${msg.to}` : msg.from}
                          </span>
                          <span className="text-xs text-gray-400">{displayDate}</span>
                        </div>
                        <div className="text-sm text-gray-800">
                          <HtmlBody html={msg.html} text={msg.text} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="px-4 py-2">
                    <button
                      onClick={() => startReply(thread.threadId, thread.subject)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
