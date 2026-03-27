import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getAreas } from '@/lib/sheets'
import Link from 'next/link'
import AdminProfileForm from './AdminProfileForm'
import AcknowledgeButton from './AcknowledgeButton'

export default async function AdminCandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase.from('candidates').select('*').eq('id', id).single()
  if (!candidate) notFound()

  const { data: details } = await supabase.from('candidate_details').select('*').eq('candidate_id', id).single()
  const areas = await getAreas()
  const { data: teamMembers } = await supabase.from('profiles').select('id, full_name, email').in('role', ['admin', 'team']).order('full_name')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/admin/candidates/${id}`} className="text-sm text-gray-500 hover:underline">← Back to {candidate.full_name}</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Profile — {candidate.full_name}</h1>
      </div>
      {details?.availability_changed && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900">Availability updated by candidate</p>
            <p className="text-xs text-amber-700 mt-0.5">Review the availability section below and acknowledge when ready.</p>
          </div>
          <AcknowledgeButton candidateId={id} />
        </div>
      )}
      <AdminProfileForm candidate={candidate} details={details} areas={areas} teamMembers={teamMembers ?? []} />
    </div>
  )
}
