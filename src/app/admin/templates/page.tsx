import { createAdminClient } from '@/lib/supabase/admin'
import { getAreas } from '@/lib/sheets'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function createTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const is_universal = formData.get('is_universal') === 'on'
  const area = (formData.get('area') as string) || null

  // Enforce single universal
  if (is_universal) {
    await supabase.from('requirement_templates').update({ is_universal: false }).eq('is_universal', true)
  }

  const { data: last } = await supabase
    .from('requirement_templates')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { error } = await supabase.from('requirement_templates').insert({
    name,
    description: description || null,
    is_universal,
    area,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  if (error) redirect(`/admin/templates?error=${encodeURIComponent(error.message)}`)
  redirect('/admin/templates')
}

async function deleteTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('requirement_templates').delete().eq('id', formData.get('id') as string)
  redirect('/admin/templates')
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = createAdminClient()
  const [params, areas, { data: templates, error: fetchError }] = await Promise.all([
    searchParams,
    getAreas(),
    supabase
      .from('requirement_templates')
      .select('*, items:template_items(count)')
      .order('is_universal', { ascending: false })
      .order('area', { ascending: true, nullsFirst: false })
      .order('sort_order'),
  ])

  const universalTemplate = templates?.find((t: any) => t.is_universal)

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Templates</h1>
      <p className="text-sm text-gray-500 mb-6">
        One <strong>Universal</strong> template auto-applies to every new candidate. Area templates are suggested based on the candidate's area.
      </p>

      {params.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{params.error}</div>
      )}
      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          Failed to load templates: {fetchError.message}
        </div>
      )}

      {/* Add form */}
      <form action={createTemplate} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">New Template</h2>
        <input name="name" placeholder="Template name (e.g. New York Onboarding) *" required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input name="description" placeholder="Description (optional)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to area (optional)</label>
            <select name="area"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No area</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="is_universal" className="rounded" />
              <span>
                Universal
                {universalTemplate && <span className="text-xs text-amber-600 ml-1">(replaces "{universalTemplate.name}")</span>}
              </span>
            </label>
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
          Create Template
        </button>
      </form>

      {/* Template list */}
      {!templates?.length ? (
        <p className="text-sm text-gray-400">No templates yet. Create one above.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {templates.map((t: any) => {
            const count = t.items?.[0]?.count ?? 0
            return (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    {t.is_universal && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Universal</span>
                    )}
                    {t.area && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.area}</span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{count} item{count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link href={`/admin/templates/${t.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                    Edit items
                  </Link>
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
