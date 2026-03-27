import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EmailThread from '@/components/EmailThread'
import AcknowledgeButton from './profile/AcknowledgeButton'
import MessageThread from '@/components/MessageThread'
import ChecklistSection from './ChecklistSection'
import TasksSection from './TasksSection'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  rejected: 'Rejected/Resigned',
}

async function updateStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('candidates')
    .update({ status: formData.get('status') as string })
    .eq('id', formData.get('id') as string)
  redirect('.')
}


function InfoPill({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (!candidate) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: checklist }, { data: tasks }, { data: gmailToken }, { data: documents }, { data: details }, { data: messages }, { data: onboarderProfile }] = await Promise.all([
    supabase.from('candidate_requirements')
      .select('*, requirement:requirement_id(*)')
      .eq('candidate_id', id)
      .order('requirement(sort_order)'),
    supabase.from('tasks')
      .select('*')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('gmail_tokens').select('email').eq('user_id', user!.id).single(),
    supabase.from('documents').select('*').eq('candidate_id', id),
    supabase.from('candidate_details').select('availability_changed').eq('candidate_id', id).single(),
    supabase.from('messages').select('*, sender:profiles(full_name)').eq('candidate_id', id).order('created_at'),
    candidate.onboarder_id
      ? supabase.from('profiles').select('full_name').eq('id', candidate.onboarder_id).single()
      : Promise.resolve({ data: null }),
  ])

  const docsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc: any) => {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  const startDate = candidate.first_class_date
    ? new Date(candidate.first_class_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const addedDate = new Date(candidate.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/admin/candidates" className="text-sm text-gray-500 hover:underline">← Candidates</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{candidate.full_name}</h1>
          <p className="text-gray-500 text-sm">{candidate.email}{candidate.phone ? ` · ${candidate.phone}` : ''}</p>
          <Link href={`/admin/candidates/${candidate.id}/profile`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">View / Edit Profile →</Link>
        </div>
        <form action={updateStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={candidate.id} />
          <select
            name="status"
            defaultValue={candidate.status}
            className={`text-sm font-medium px-3 py-1.5 rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[candidate.status]}`}
          >
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="rejected">Rejected/Resigned</option>
          </select>
          <button type="submit" className="text-xs text-gray-500 hover:underline">Save</button>
        </form>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-6 bg-white border border-gray-200 rounded-lg px-5 py-4 mb-6">
        <InfoPill label="Added" value={addedDate} />
        <InfoPill label="Start Date" value={startDate} />
        <InfoPill label="Stage" value={statusLabels[candidate.status] ?? candidate.status} />
        <InfoPill label="Area" value={candidate.area} />
        <InfoPill label="Scheduler" value={candidate.scheduler} />
        <InfoPill label="Field Manager" value={candidate.field_manager} />
        <InfoPill label="Trainer" value={candidate.trainer} />
        <InfoPill label="Onboarder" value={onboarderProfile?.full_name ?? null} />
      </div>

      {/* Availability changed banner */}
      {details?.availability_changed && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900">Availability updated by candidate</p>
            <p className="text-xs text-amber-700 mt-0.5">
              <Link href={`/admin/candidates/${id}/profile`} className="underline">View their profile</Link> to review changes.
            </p>
          </div>
          <AcknowledgeButton candidateId={id} />
        </div>
      )}

      {/* Requirements + Tasks side by side */}
      <div className="flex gap-6 mb-8 items-start">
        <section className="flex-1 min-w-0">
          <ChecklistSection
            initialItems={checklist ?? []}
            docs={docsWithUrls}
            candidateId={id}
            currentUserId={user!.id}
          />
        </section>
        <section className="w-80 flex-shrink-0">
          <TasksSection
            initialTasks={tasks ?? []}
            candidateId={id}
            currentUserId={user!.id}
          />
        </section>
      </div>

      {/* Messages */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Messages</h2>
        <MessageThread
          candidateId={id}
          currentUserId={user!.id}
          initialMessages={messages ?? []}
        />
      </section>

      {/* Email — full width */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Email</h2>
        <EmailThread
          candidateId={candidate.id}
          candidateEmail={candidate.email}
          candidateName={candidate.full_name}
          gmailConnected={!!gmailToken}
        />
      </section>
    </div>
  )
}
