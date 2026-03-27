import { createClient } from '@/lib/supabase/server'
import { fetchThreadMessages, getOAuthClient } from '@/lib/gmail'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidateId = request.nextUrl.searchParams.get('candidateId')
  if (!candidateId) return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 })

  const { data: token } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!token) return NextResponse.json({ threads: [] })

  const { data: candidate } = await supabase
    .from('candidates')
    .select('email, created_at')
    .eq('id', candidateId)
    .single()

  if (!candidate) return NextResponse.json({ threads: [] })

  const afterDate = new Date(candidate.created_at)
  const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`

  const client = getOAuthClient()
  client.setCredentials({ access_token: token.access_token, refresh_token: token.refresh_token })
  const gmail = google.gmail({ version: 'v1', auth: client })

  const searchRes = await gmail.users.messages.list({
    userId: 'me',
    q: `(from:${candidate.email} OR to:${candidate.email}) after:${afterStr}`,
    maxResults: 100,
  })

  const messageRefs = searchRes.data.messages ?? []
  if (!messageRefs.length) return NextResponse.json({ threads: [], connectedEmail: token.email })

  const threadIds = [...new Set(messageRefs.map(m => m.threadId).filter(Boolean) as string[])]

  type EmailMessage = Awaited<ReturnType<typeof fetchThreadMessages>>[number]
  const threadMap = new Map<string, { threadId: string; subject: string; messages: EmailMessage[] }>()

  for (const threadId of threadIds) {
    try {
      const msgs = await fetchThreadMessages(threadId, token.access_token, token.refresh_token)
      if (!msgs.length) continue
      // Deduplicate within thread
      const seen = new Set<string>()
      const unique = msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      unique.sort((a, b) => Number(a.internalDate) - Number(b.internalDate))
      threadMap.set(threadId, {
        threadId,
        subject: unique[0].subject,
        messages: unique,
      })
    } catch {
      // skip deleted/inaccessible threads
    }
  }

  // Sort threads: most recent last message first
  const threads = Array.from(threadMap.values()).sort((a, b) => {
    const aLast = Number(a.messages[a.messages.length - 1].internalDate)
    const bLast = Number(b.messages[b.messages.length - 1].internalDate)
    return bLast - aLast
  })

  return NextResponse.json({ threads, connectedEmail: token.email })
}
