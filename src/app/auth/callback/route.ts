import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  // Invite/recovery tokens: pass through to reset-password for client-side verification
  // so the session is established in the browser (not server-only cookies)
  if (token_hash && (type === 'invite' || next === '/reset-password')) {
    const dest = new URL('/reset-password', request.url)
    dest.searchParams.set('token_hash', token_hash)
    dest.searchParams.set('type', type ?? 'invite')
    return NextResponse.redirect(dest)
  }

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any })
  }

  return NextResponse.redirect(new URL(next ?? '/admin', request.url))
}
