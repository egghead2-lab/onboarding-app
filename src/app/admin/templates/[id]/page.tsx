import { createAdminClient } from '@/lib/supabase/admin'
import { getAreas } from '@/lib/sheets'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TemplateItemRow from './TemplateItemRow'
import AddExistingRequirements from './AddExistingRequirements'

async function updateTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  const is_universal = formData.get('is_universal') === 'on'

  // Enforce single universal
  if (is_universal) {
    await supabase.from('requirement_templates').update({ is_universal: false }).eq('is_universal', true).neq('id', id)
  }

  await supabase.from('requirement_templates').update({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    is_universal,
    area: (formData.get('area') as string) || null,
  }).eq('id', id)
  redirect(`/admin/templates/${id}`)
}

async function createItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const template_id = formData.get('template_id') as string
  const offsetValue = formData.get('due_offset_value')
  const offsetDir = formData.get('due_offset_direction') as string
  const due_offset_days = offsetValue ? (offsetDir === 'before' ? -Number(offsetValue) : Number(offsetValue)) : null

  const { data: last } = await supabase
    .from('template_items')
    .select('sort_order')
    .eq('template_id', template_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('template_items').insert({
    template_id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    type: formData.get('type') as string,
    due_offset_days,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  redirect(`/admin/templates/${template_id}`)
}

async function addExistingItems(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const template_id = formData.get('template_id') as string
  const selected = formData.getAll('req_ids') as string[]
  if (!selected.length) return redirect(`/admin/templates/${template_id}`)

  // Fetch the selected requirements
  const { data: reqs } = await supabase
    .from('requirements')
    .select('*')
    .in('id', selected)

  if (!reqs?.length) return redirect(`/admin/templates/${template_id}`)

  // Get existing template item titles to avoid duplicates
  const { data: existing } = await supabase
    .from('template_items')
    .select('title')
    .eq('template_id', template_id)
  const existingTitles = new Set((existing ?? []).map((i: any) => i.title.toLowerCase()))

  const { data: last } = await supabase
    .from('template_items')
    .select('sort_order')
    .eq('template_id', template_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  let nextOrder = (last?.sort_order ?? 0) + 1

  const toInsert = reqs
    .filter((r: any) => !existingTitles.has(r.title.toLowerCase()))
    .map((r: any) => ({
      template_id,
      title: r.title,
      description: r.description ?? null,
      type: r.type,
      due_offset_days: r.due_offset_days ?? null,
      sort_order: nextOrder++,
    }))

  if (toInsert.length) await supabase.from('template_items').insert(toInsert)
  redirect(`/admin/templates/${template_id}`)
}

async function updateItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  const offsetValue = formData.get('due_offset_value')
  const offsetDir = formData.get('due_offset_direction') as string
  const due_offset_days = offsetValue ? (offsetDir === 'before' ? -Number(offsetValue) : Number(offsetValue)) : null

  const { data: item } = await supabase.from('template_items').select('template_id').eq('id', id).single()
  await supabase.from('template_items').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    type: formData.get('type') as string,
    due_offset_days,
  }).eq('id', id)

  redirect(`/admin/templates/${item?.template_id}`)
}

async function deleteItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  const { data: item } = await supabase.from('template_items').select('template_id').eq('id', id).single()
  await supabase.from('template_items').delete().eq('id', id)
  redirect(`/admin/templates/${item?.template_id}`)
}

async function moveItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  const direction = formData.get('direction') as string

  const { data: current } = await supabase.from('template_items').select('sort_order, template_id').eq('id', id).single()
  if (!current) return redirect('/admin/templates')

  const neighborQuery = supabase
    .from('template_items')
    .select('id, sort_order')
    .eq('template_id', current.template_id)
    .limit(1)

  const { data: neighbor } = direction === 'up'
    ? await neighborQuery.lt('sort_order', current.sort_order).order('sort_order', { ascending: false })
    : await neighborQuery.gt('sort_order', current.sort_order).order('sort_order', { ascending: true })

  const neighborRow = neighbor?.[0]
  if (!neighborRow) return redirect(`/admin/templates/${current.template_id}`)

  await supabase.from('template_items').update({ sort_order: neighborRow.sort_order }).eq('id', id)
  await supabase.from('template_items').update({ sort_order: current.sort_order }).eq('id', neighborRow.id)

  redirect(`/admin/templates/${current.template_id}`)
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: template } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!template) notFound()

  const [{ data: items }, { data: allRequirements }, areas] = await Promise.all([
    supabase.from('template_items').select('*').eq('template_id', id).order('sort_order'),
    supabase.from('requirements').select('*').order('type').order('sort_order'),
    getAreas(),
  ])

  const grouped = {
    onboarding: items?.filter((i: any) => i.type === 'onboarding') ?? [],
    training: items?.filter((i: any) => i.type === 'training') ?? [],
  }

  // Filter out requirements already in the template
  const existingTitles = new Set((items ?? []).map((i: any) => i.title.toLowerCase()))
  const availableRequirements = (allRequirements ?? []).filter(
    (r: any) => !existingTitles.has(r.title.toLowerCase())
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:text-blue-600">← Templates</Link>
      </div>

      {/* Template header / edit */}
      <form action={updateTemplate} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
        <input type="hidden" name="id" value={template.id} />
        <h2 className="text-sm font-semibold text-gray-700">Template Settings</h2>
        <input name="name" defaultValue={template.name} required placeholder="Template name"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input name="description" defaultValue={template.description ?? ''} placeholder="Description (optional)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to area (optional)</label>
            <select name="area" defaultValue={template.area ?? ''}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No area</option>
              {areas.map((a: string) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="is_universal" defaultChecked={template.is_universal} className="rounded" />
              Universal
            </label>
          </div>
        </div>
        <button type="submit" className="bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">
          Save Settings
        </button>
      </form>

      {/* Add from existing requirements */}
      <AddExistingRequirements
        templateId={template.id}
        requirements={availableRequirements}
        addAction={addExistingItems}
      />

      {/* Add brand-new item */}
      <form action={createItem} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-3">
        <input type="hidden" name="template_id" value={template.id} />
        <h2 className="text-sm font-semibold text-gray-700">Add New Item</h2>
        <p className="text-xs text-gray-500">Creates a brand-new requirement specific to this template.</p>
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
          Add Item
        </button>
      </form>

      {/* Current items grouped by type */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Items in this template ({items?.length ?? 0})
      </h2>
      {(['onboarding', 'training'] as const).map((type) => (
        <div key={type} className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">{type}</h3>
          {!grouped[type].length ? (
            <p className="text-sm text-gray-400">No {type} items yet.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {grouped[type].map((item: any, i: number) => (
                <TemplateItemRow
                  key={item.id}
                  item={item}
                  isFirst={i === 0}
                  isLast={i === grouped[type].length - 1}
                  moveAction={moveItem}
                  updateAction={updateItem}
                  deleteAction={deleteItem}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
