import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAreas } from '@/lib/sheets'
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

  // Apply selected template items
  const itemsJson = formData.get('items_json') as string
  const items: { title: string; description: string | null; type: string; due_offset_days: number | null }[] =
    itemsJson ? JSON.parse(itemsJson) : []

  if (items.length > 0) {
    const { data: lastReq } = await supabase
      .from('requirements')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()
    let nextOrder = (lastReq?.sort_order ?? 0) + 1

    const requirementIds: string[] = []
    for (const item of items) {
      // Find existing requirement by title + type, or create one
      const { data: existing } = await supabase
        .from('requirements')
        .select('id')
        .eq('title', item.title)
        .eq('type', item.type)
        .single()

      if (existing) {
        requirementIds.push(existing.id)
      } else {
        const { data: newReq } = await supabase
          .from('requirements')
          .insert({
            title: item.title,
            description: item.description,
            type: item.type,
            due_offset_days: item.due_offset_days,
            sort_order: nextOrder++,
          })
          .select('id')
          .single()
        if (newReq) requirementIds.push(newReq.id)
      }
    }

    if (requirementIds.length > 0) {
      await supabase.from('candidate_requirements').insert(
        requirementIds.map((rid) => ({ candidate_id: candidate.id, requirement_id: rid }))
      )
    }
  }

  redirect(`/admin/candidates/${candidate.id}`)
}

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const areas = await getAreas()

  const { data: templates } = await supabase
    .from('requirement_templates')
    .select('*, items:template_items(*), tagged:requirements(id,title,description,type,due_offset_days,sort_order)')
    .order('is_universal', { ascending: false })
    .order('sort_order')

  const templateList = (templates ?? []).map((t: any) => {
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
    return {
      id: t.id,
      name: t.name,
      is_universal: t.is_universal,
      items: merged.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }
  })

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Candidate</h1>
      {params.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {params.error}
        </div>
      )}
      <NewCandidateForm areas={areas} templates={templateList} action={createCandidate} />
    </div>
  )
}
