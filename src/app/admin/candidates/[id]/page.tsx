import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import EmailThread from '@/components/EmailThread'
import AcknowledgeButton from './profile/AcknowledgeButton'
import MessageThread from '@/components/MessageThread'
import ChecklistSection from './ChecklistSection'
import TasksSection from './TasksSection'
import CollapsibleSection from './CollapsibleSection'
import ApplyTemplateButton from './ApplyTemplateButton'

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

async function applyTemplate(candidateId: string, templateId: string): Promise<{ added: number; skipped: number; alreadyApplied: boolean; templateName: string }> {
  'use server'
  const supabase = createAdminClient()

  // Check if already applied
  const { data: templateInfo } = await supabase.from('requirement_templates').select('name').eq('id', templateId).single()
  const templateName = templateInfo?.name ?? 'Unknown'

  const { data: alreadyApplied } = await supabase
    .from('candidate_applied_templates')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('template_id', templateId)
    .single()

  if (alreadyApplied) return { added: 0, skipped: 0, alreadyApplied: true, templateName }

  // Merge template_items (manually curated) + requirements tagged to this template
  const [{ data: templateItems }, { data: taggedReqs }] = await Promise.all([
    supabase.from('template_items').select('*').eq('template_id', templateId),
    supabase.from('requirements').select('*').eq('template_id', templateId),
  ])

  // Deduplicate by title+type — tagged requirements take precedence (they have real IDs)
  const seen = new Set<string>()
  const allItems: { title: string; description: string | null; type: string; due_offset_days: number | null; existing_req_id?: string }[] = []
  for (const r of taggedReqs ?? []) {
    const key = `${r.title.toLowerCase()}|${r.type}`
    if (!seen.has(key)) { seen.add(key); allItems.push({ ...r, existing_req_id: r.id }) }
  }
  for (const i of templateItems ?? []) {
    const key = `${i.title.toLowerCase()}|${i.type}`
    if (!seen.has(key)) { seen.add(key); allItems.push(i) }
  }

  if (!allItems.length) return { added: 0, skipped: 0, alreadyApplied: false, templateName }

  // Get requirements already assigned to this candidate
  const { data: existing } = await supabase
    .from('candidate_requirements')
    .select('requirement:requirement_id(title, type)')
    .eq('candidate_id', candidateId)
  const existingKeys = new Set(
    (existing ?? []).map((cr: any) => `${cr.requirement?.title?.toLowerCase()}|${cr.requirement?.type}`)
  )

  const { data: lastReq } = await supabase
    .from('requirements')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  let nextOrder = (lastReq?.sort_order ?? 0) + 1

  let added = 0
  let skipped = 0

  for (const item of allItems) {
    const key = `${item.title.toLowerCase()}|${item.type}`
    if (existingKeys.has(key)) { skipped++; continue }

    // Use existing requirement ID if already tagged, otherwise find or create
    let reqId = item.existing_req_id
    if (!reqId) {
      const { data: existingReq } = await supabase.from('requirements').select('id').eq('title', item.title).eq('type', item.type).single()
      reqId = existingReq?.id
      if (!reqId) {
        const { data: newReq } = await supabase.from('requirements')
          .insert({ title: item.title, description: item.description, type: item.type, due_offset_days: item.due_offset_days, sort_order: nextOrder++ })
          .select('id').single()
        reqId = newReq?.id
      }
    }

    if (reqId) {
      await supabase.from('candidate_requirements').insert({ candidate_id: candidateId, requirement_id: reqId })
      added++
    }
  }

  // Record that this template was applied
  await supabase.from('candidate_applied_templates').insert({ candidate_id: candidateId, template_id: templateId })

  return { added, skipped, alreadyApplied: false, templateName }
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

  const adminClient = createAdminClient()
  const [{ data: checklist }, { data: tasks }, { data: gmailToken }, { data: documents }, { data: details }, { data: messages }, { data: onboarderProfile }, { data: teamMembers }, { data: templates }, { data: appliedTemplates }, { data: emailTemplates }] = await Promise.all([
    supabase.from('candidate_requirements')
      .select('*, requirement:requirement_id(*), assignee:assigned_to(full_name)')
      .eq('candidate_id', id)
      .order('requirement(sort_order)'),
    supabase.from('tasks')
      .select('*, assignee:assigned_to(full_name)')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('gmail_tokens').select('email').eq('user_id', user!.id).single(),
    supabase.from('documents').select('*').eq('candidate_id', id),
    supabase.from('candidate_details').select('availability_changed').eq('candidate_id', id).single(),
    supabase.from('messages').select('*, sender:profiles(full_name)').eq('candidate_id', id).order('created_at'),
    candidate.onboarder_id
      ? supabase.from('profiles').select('full_name').eq('id', candidate.onboarder_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles').select('id, full_name, email, staff_role').in('role', ['admin', 'team']).order('full_name'),
    adminClient.from('requirement_templates').select('*, items:template_items(*), tagged:requirements(id,title,description,type,due_offset_days,sort_order)').order('is_universal', { ascending: false }).order('sort_order'),
    adminClient.from('candidate_applied_templates').select('template_id, applied_at, template:template_id(name)').eq('candidate_id', id).order('applied_at'),
    adminClient.from('email_templates').select('id, name, subject, body, requirement_id').order('sort_order'),
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
        <InfoPill label="Training Type" value={candidate.training_type} />
        {candidate.pay_rate != null && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Pay Rate</span>
            <span className="text-sm font-medium text-gray-900">${Number(candidate.pay_rate).toFixed(2)}</span>
          </div>
        )}
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

      {/* Requirements */}
      <div className="mb-8">
        <ApplyTemplateButton
          candidateId={id}
          candidateArea={candidate.area ?? null}
          appliedTemplateIds={new Set((appliedTemplates ?? []).map((a: any) => a.template_id))}
          appliedHistory={(appliedTemplates ?? []).map((a: any) => ({ id: a.template_id, name: (a.template as any)?.name ?? 'Unknown', appliedAt: a.applied_at }))}
          templates={(templates ?? []).map((t: any) => {
            const seen = new Set<string>()
            const merged: any[] = []
            for (const r of (t.tagged ?? [])) {
              const key = `${r.title.toLowerCase()}|${r.type}`
              if (!seen.has(key)) { seen.add(key); merged.push(r) }
            }
            for (const i of (t.items ?? [])) {
              const key = `${i.title.toLowerCase()}|${i.type}`
              if (!seen.has(key)) { seen.add(key); merged.push(i) }
            }
            return { id: t.id, name: t.name, is_universal: t.is_universal, area: t.area ?? null, items: merged.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) }
          })}
          applyAction={applyTemplate}
        />
        <ChecklistSection
          initialItems={checklist ?? []}
          docs={docsWithUrls}
          candidateId={id}
          candidateName={candidate.full_name}
          candidateEmail={candidate.email}
          gmailConnected={!!gmailToken}
          currentUserId={user!.id}
          teamMembers={teamMembers ?? []}
          emailTemplates={emailTemplates ?? []}
        />
      </div>

      {/* Tasks */}
      <CollapsibleSection title="Tasks" defaultOpen={true}>
        <TasksSection
          initialTasks={tasks ?? []}
          candidateId={id}
          currentUserId={user!.id}
        />
      </CollapsibleSection>

      {/* Messages */}
      <CollapsibleSection title="Messages" defaultOpen={true}>
        <MessageThread
          candidateId={id}
          currentUserId={user!.id}
          initialMessages={messages ?? []}
        />
      </CollapsibleSection>

      {/* Email */}
      <CollapsibleSection title="Email" defaultOpen={false}>
        <EmailThread
          candidateId={candidate.id}
          candidateEmail={candidate.email}
          candidateName={candidate.full_name}
          gmailConnected={!!gmailToken}
        />
      </CollapsibleSection>
    </div>
  )
}
