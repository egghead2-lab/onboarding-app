import { getOAuthClient } from '@/lib/gmail'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/admin?error=gmail', request.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  // Get the Gmail address this token belongs to
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data: googleUser } = await oauth2.userinfo.get()

  await supabase.from('gmail_tokens').upsert({
    user_id: user.id,
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    email: googleUser.email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(new URL('/admin?gmail=connected', request.url))
}
