import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/gmail'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, candidateId, threadId } = await request.json()

  const { data: token } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!token) return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })

  const sent = await sendEmail({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    to,
    subject,
    body,
    threadId,
  })

  // Save thread record
  if (candidateId) {
    await supabase.from('email_threads').upsert({
      candidate_id: candidateId,
      gmail_thread_id: sent.threadId,
      subject,
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'gmail_thread_id' })
  }

  return NextResponse.json({ success: true, threadId: sent.threadId })
}
