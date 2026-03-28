import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UploadButton from '@/components/UploadButton'
import DeleteDocumentButton from '@/components/DeleteDocumentButton'
import MessageThread from '@/components/MessageThread'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client to bypass RLS — session propagation after invite OTP can be unreliable
  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient()

  let { data: candidate } = await adminClient
    .from('candidates')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Fallback: match by email and backfill profile_id
  if (!candidate && user.email) {
    const { data: byEmail } = await adminClient
      .from('candidates')
      .select('*')
      .eq('email', user.email)
      .single()

    if (byEmail) {
      await adminClient.from('candidates').update({ profile_id: user.id }).eq('id', byEmail.id)
      candidate = { ...byEmail, profile_id: user.id }
    }
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No record found</h2>
        <p className="text-sm text-gray-500">Your account hasn't been linked to a candidate record yet. Please contact your coordinator.</p>
      </div>
    )
  }

  // First login — redirect to profile if not yet filled out
  const { data: details } = await supabase
    .from('candidate_details')
    .select('id')
    .eq('candidate_id', candidate.id)
    .single()

  if (!details) redirect('/portal/profile?first=1')

  const { data: checklist } = await supabase
    .from('candidate_requirements')
    .select('*, requirement:requirement_id(*)')
    .eq('candidate_id', candidate.id)
    .order('requirement(sort_order)')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('candidate_id', candidate.id)

  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:profiles(full_name)')
    .eq('candidate_id', candidate.id)
    .order('created_at')

  const completedCount = checklist?.filter((c: any) => c.completed).length ?? 0
  const totalCount = checklist?.length ?? 0
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome, {candidate.full_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Here's your onboarding progress</p>
            <a href="/portal/profile" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Edit my profile →</a>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[candidate.status]}`}>
            {candidate.status.replace('_', ' ')}
          </span>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{completedCount} of {totalCount} requirements complete</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Requirements</h3>
        {!checklist?.length ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
            No requirements assigned yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {checklist.map((item: any) => {
              const uploadedDocs = documents?.filter((d: any) => d.requirement_id === item.requirement_id) ?? []
              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.requirement?.title}
                      </p>
                      {item.requirement?.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.requirement.description}</p>
                      )}
                      {item.requirement?.requires_document && (
                        <div className="mt-2 space-y-1">
                          {uploadedDocs.map((doc: any) => (
                            <div key={doc.id} className="flex items-center gap-1">
                              <p className="text-xs text-green-600">✓ {doc.file_name}</p>
                              <DeleteDocumentButton
                                documentId={doc.id}
                                storagePath={doc.storage_path}
                              />
                            </div>
                          ))}
                          {!item.completed && (
                            <UploadButton
                              candidateId={candidate.id}
                              requirementId={item.requirement_id}
                              userId={user.id}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {!item.completed && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex-shrink-0">pending</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Messages */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Messages</h3>
        <MessageThread
          candidateId={candidate.id}
          currentUserId={user.id}
          initialMessages={messages ?? []}
        />
      </div>
    </div>
  )
}
