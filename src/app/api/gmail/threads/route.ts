import { createClient } from '@/lib/supabase/server'
import { fetchThreadMessages } from '@/lib/gmail'
import { getOAuthClient } from '@/lib/gmail'
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

  if (!token) return NextResponse.json({ messages: [] })

  const { data: candidate } = await supabase
    .from('candidates')
    .select('email, created_at')
    .eq('id', candidateId)
    .single()

  if (!candidate) return NextResponse.json({ messages: [] })

  // Format date as YYYY/MM/DD for Gmail search
  const afterDate = new Date(candidate.created_at)
  const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`

  const client = getOAuthClient()
  client.setCredentials({ access_token: token.access_token, refresh_token: token.refresh_token })
  const gmail = google.gmail({ version: 'v1', auth: client })

  // Search for all emails to or from the candidate after their invite date
  const searchRes = await gmail.users.messages.list({
    userId: 'me',
    q: `(from:${candidate.email} OR to:${candidate.email}) after:${afterStr}`,
    maxResults: 100,
  })

  const messageRefs = searchRes.data.messages ?? []
  if (!messageRefs.length) return NextResponse.json({ messages: [], connectedEmail: token.email })

  // Deduplicate by threadId, then fetch each thread once
  const threadIds = [...new Set(messageRefs.map(m => m.threadId).filter(Boolean) as string[])]

  const allMessages: Awaited<ReturnType<typeof fetchThreadMessages>> = []
  for (const threadId of threadIds) {
    try {
      const msgs = await fetchThreadMessages(threadId, token.access_token, token.refresh_token)
      allMessages.push(...msgs)
    } catch {
      // skip deleted/inaccessible threads
    }
  }

  // Deduplicate messages by id and sort chronologically
  const seen = new Set<string>()
  const unique = allMessages.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
  unique.sort((a, b) => Number(a.internalDate) - Number(b.internalDate))

  return NextResponse.json({ messages: unique, connectedEmail: token.email })
}
