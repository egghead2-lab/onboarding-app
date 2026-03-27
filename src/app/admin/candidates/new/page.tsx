import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAreas, lookupArea } from '@/lib/sheets'
import { redirect } from 'next/navigation'
import NewCandidateForm from './NewCandidateForm'

async function createCandidate(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const area = formData.get('area') as string
  const trainer = formData.get('trainer') as string
  const field_manager = formData.get('field_manager') as string
  const scheduler = formData.get('scheduler') as string

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: 'candidate' },
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (inviteError) {
    redirect(`/admin/candidates/new?error=${encodeURIComponent(inviteError.message)}`)
  }

  const { data: candidate, error } = await supabase
    .from('candidates')
    .insert({
      full_name,
      email,
      phone: phone || null,
      status: 'in_progress',
      profile_id: inviteData.user.id,
      area: area || null,
      trainer: trainer || null,
      field_manager: field_manager || null,
      scheduler: scheduler || null,
    })
    .select()
    .single()

  if (error || !candidate) {
    redirect(`/admin/candidates/new?error=${encodeURIComponent(error?.message ?? 'Insert failed')}`)
  }

  const { data: requirements } = await supabase.from('requirements').select('id')
  if (requirements?.length) {
    await supabase.from('candidate_requirements').insert(
      requirements.map((r: any) => ({ candidate_id: candidate.id, requirement_id: r.id }))
    )
  }

  redirect(`/admin/candidates/${candidate.id}`)
}

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const areas = await getAreas()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Candidate</h1>
      {params.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {params.error}
        </div>
      )}
      <NewCandidateForm areas={areas} action={createCandidate} />
    </div>
  )
}
