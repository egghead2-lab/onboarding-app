import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Must be a candidate role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'candidate') {
    redirect('/admin')
  }

  // Mark invite as accepted on first portal visit
  await createAdminClient()
    .from('candidates')
    .update({ accepted_at: new Date().toISOString() })
    .eq('profile_id', user.id)
    .is('accepted_at', null)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Professor Egghead Science Academy" width={120} height={50} />
          <span className="text-sm font-medium text-gray-600 hidden sm:block">Onboarding Portal</span>
        </div>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </form>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
