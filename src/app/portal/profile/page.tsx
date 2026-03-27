import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!candidate) redirect('/portal')

  const { data: details } = await supabase
    .from('candidate_details')
    .select('*')
    .eq('candidate_id', candidate.id)
    .single()

  const params = await searchParams
  const isFirst = params.first === '1'

  return (
    <div>
      {isFirst && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900">Welcome, {candidate.full_name}!</p>
          <p className="text-sm text-blue-700 mt-0.5">Please complete your profile before getting started. You can update it anytime.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
        {!isFirst && <a href="/portal" className="text-sm text-gray-500 hover:underline">← Back</a>}
      </div>
      <ProfileForm candidate={candidate} details={details} isFirst={isFirst} />
    </div>
  )
}
