import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any })
  }

  // Invite links always go to reset-password to set initial password
  if (type === 'invite') {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  return NextResponse.redirect(new URL(next ?? '/admin', request.url))
}
