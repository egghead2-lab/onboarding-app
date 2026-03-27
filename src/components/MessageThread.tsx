'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  body: string
  created_at: string
  is_read: boolean
  sender_id: string
  attachment_path: string | null
  attachment_name: string | null
  sender: { full_name: string | null } | null
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']

function isImage(name: string) {
  return IMAGE_EXTS.includes(name.split('.').pop()?.toLowerCase() ?? '')
}

export default function MessageThread({
  candidateId,
  currentUserId,
  initialMessages,
}: {
  candidateId: string
  currentUserId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function fetchAndMarkRead() {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(full_name)')
      .eq('candidate_id', candidateId)
      .order('created_at')

    if (data) {
      setMessages(data)

      // Generate signed URLs for attachments
      const urls: Record<string, string> = {}
      for (const m of data) {
        if (m.attachment_path) {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(m.attachment_path, 3600)
          if (signed?.signedUrl) urls[m.id] = signed.signedUrl
        }
      }
      setSignedUrls(urls)

      const unreadIds = data
        .filter((m) => !m.is_read && m.sender_id !== currentUserId)
        .map((m) => m.id)
      if (unreadIds.length) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      }
    }
  }

  useEffect(() => {
    fetchAndMarkRead()
    const interval = setInterval(fetchAndMarkRead, 5000)
    return () => clearInterval(interval)
  }, [candidateId])

  const prevCountRef = useRef(initialMessages.length)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() && !pendingFile) return
    setSending(true)

    let attachment_path: string | null = null
    let attachment_name: string | null = null

    if (pendingFile) {
      const ext = pendingFile.name.split('.').pop()
      const path = `messages/${candidateId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(path, pendingFile)
      if (!error) {
        attachment_path = path
        attachment_name = pendingFile.name
      }
    }

    const { data } = await supabase
      .from('messages')
      .insert({
        candidate_id: candidateId,
        sender_id: currentUserId,
        body: body.trim(),
        attachment_path,
        attachment_name,
      })
      .select('*, sender:profiles(full_name)')
      .single()

    if (data) {
      if (data.attachment_path) {
        const { data: signed } = await supabase.storage
          .from('documents')
          .createSignedUrl(data.attachment_path, 3600)
        if (signed?.signedUrl) {
          setSignedUrls((prev) => ({ ...prev, [data.id]: signed.signedUrl }))
        }
      }
      setMessages((prev) => [...prev, data])
      setBody('')
      setPendingFile(null)
    }
    setSending(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg flex flex-col">
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No messages yet.</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId
          const url = signedUrls[m.id]
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-sm rounded-lg text-sm overflow-hidden ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                {url && m.attachment_name && isImage(m.attachment_name) && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={m.attachment_name} className="max-w-xs max-h-48 object-contain" />
                  </a>
                )}
                {url && m.attachment_name && !isImage(m.attachment_name) && (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 underline text-xs ${isMine ? 'text-blue-100' : 'text-blue-600'}`}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {m.attachment_name}
                  </a>
                )}
                {m.body && <p className="px-3 py-2">{m.body}</p>}
              </div>
              <span className="text-xs text-gray-400 mt-0.5">
                {m.sender?.full_name ?? 'Unknown'} · {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {pendingFile && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <span className="text-xs text-gray-600 truncate max-w-xs">{pendingFile.name}</span>
          <button type="button" onClick={() => setPendingFile(null)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
        </div>
      )}

      <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          title="Attach file"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={sending || (!body.trim() && !pendingFile)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
