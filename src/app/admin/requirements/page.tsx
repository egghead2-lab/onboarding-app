import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import RequirementsFilter from './RequirementsFilter'
import RequirementRow from './RequirementRow'

async function createRequirement(formData: FormData) {
  'use server'
  const supabase = await createClient()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const type = formData.get('type') as string
  const offsetValue = formData.get('due_offset_value')
  const offsetDir = formData.get('due_offset_direction') as string
  const due_offset_days = offsetValue ? (offsetDir === 'before' ? -Number(offsetValue) : Number(offsetValue)) : null
  const requires_document = formData.get('requires_document') === 'on'
  const templateVal = formData.get('template_id') as string
  const template_id = templateVal && templateVal !== 'unspecified' ? templateVal : null

  const { data: last } = await supabase.from('requirements').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()

  await supabase.from('requirements').insert({
    title,
    description: description || null,
    type,
    due_offset_days,
    requires_document,
    template_id,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  redirect('/admin/requirements')
}

async function updateRequirement(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const offsetValue = formData.get('due_offset_value')
  const offsetDir = formData.get('due_offset_direction') as string
  const due_offset_days = offsetValue ? (offsetDir === 'before' ? -Number(offsetValue) : Number(offsetValue)) : null
  const templateVal = formData.get('template_id') as string
  const template_id = templateVal && templateVal !== 'unspecified' ? templateVal : null

  await supabase.from('requirements').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    type: formData.get('type') as string,
    due_offset_days,
    requires_document: formData.get('requires_document') === 'on',
    template_id,
  }).eq('id', id)

  if (due_offset_days != null) {
    const { data: candReqs } = await supabase
      .from('candidate_requirements')
      .select('id, candidate:candidate_id(first_class_date)')
      .eq('requirement_id', id)

    for (const cr of candReqs ?? []) {
      const firstClassDate = (cr.candidate as any)?.first_class_date
      if (!firstClassDate) continue
      const d = new Date(firstClassDate)
      d.setDate(d.getDate() + due_offset_days)
      await supabase.from('candidate_requirements').update({ due_date: d.toISOString().split('T')[0] }).eq('id', cr.id)
    }
  } else {
    await supabase.from('candidate_requirements').update({ due_date: null }).eq('requirement_id', id)
  }

  redirect('/admin/requirements')
}

async function deleteRequirement(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('requirements').delete().eq('id', formData.get('id') as string)
  redirect('/admin/requirements')
}

async function moveRequirement(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as string

  const { data: current } = await supabase.from('requirements').select('sort_order').eq('id', id).single()
  if (!current) return redirect('/admin/requirements')

  const neighborQuery = supabase.from('requirements').select('id, sort_order').limit(1)
  const { data: neighbor } = direction === 'up'
    ? await neighborQuery.lt('sort_order', current.sort_order).order('sort_order', { ascending: false })
    : await neighborQuery.gt('sort_order', current.sort_order).order('sort_order', { ascending: true })

  const neighborRow = neighbor?.[0]
  if (!neighborRow) return redirect('/admin/requirements')

  await supabase.from('requirements').update({ sort_order: neighborRow.sort_order }).eq('id', id)
  await supabase.from('requirements').update({ sort_order: current.sort_order }).eq('id', neighborRow.id)

  redirect('/admin/requirements')
}

export default async function RequirementsPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [{ data: requirements }, { data: templates }] = await Promise.all([
    supabase.from('requirements').select('*').order('sort_order'),
    adminClient.from('requirement_templates').select('id, name, is_universal, area').order('is_universal', { ascending: false }).order('sort_order'),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Requirements</h1>

      {/* Add form */}
      <form action={createRequirement} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Add Requirement</h2>
        <input name="title" placeholder="Requirement title *" required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input name="description" placeholder="Description (optional)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select name="type" required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="onboarding">Onboarding</option>
              <option value="training">Training</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
            <div className="flex gap-1">
              <input name="due_offset_value" type="number" min="0" placeholder="Days"
                className="w-20 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select name="due_offset_direction"
                className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="before">days before</option>
                <option value="after">days after</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Template assignment</label>
          <select name="template_id"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="unspecified">Unspecified</option>
            {templates?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.is_universal ? '★ Universal — ' : ''}{t.name}{t.area ? ` (${t.area})` : ''}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="requires_document" className="rounded" />
          Requires document upload
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
          Add Requirement
        </button>
      </form>

      {/* Filterable requirements list */}
      <RequirementsFilter
        requirements={requirements ?? []}
        templates={templates ?? []}
        moveAction={moveRequirement}
        updateAction={updateRequirement}
        deleteAction={deleteRequirement}
      />
    </div>
  )
}
