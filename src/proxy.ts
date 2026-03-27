import { NextResponse, type NextRequest } from 'next/server'

// Optimistic check only - just look for the Supabase auth cookie
// Real auth validation happens in each layout/page via supabase.auth.getUser()
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/admin') || (pathname.startsWith('/portal') && !pathname.startsWith('/portal/reset'))
  if (!isProtected) return NextResponse.next()

  // Check for Supabase session cookie (optimistic - not cryptographically verified here)
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
}
