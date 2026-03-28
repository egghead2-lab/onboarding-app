import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function createEmailTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const name = formData.get('name') as string
  const subject = formData.get('subject') as string
  const body = formData.get('body') as string
  const requirement_id = (formData.get('requirement_id') as string) || null

  const { data: last } = await supabase
    .from('email_templates')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { error } = await supabase.from('email_templates').insert({
    name,
    subject,
    body,
    requirement_id,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  if (error) redirect(`/admin/email-templates?error=${encodeURIComponent(error.message)}`)
  redirect('/admin/email-templates')
}

async function deleteEmailTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('email_templates').delete().eq('id', formData.get('id') as string)
  redirect('/admin/email-templates')
}

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = createAdminClient()
  const [params, { data: templates }, { data: requirements }] = await Promise.all([
    searchParams,
    supabase
      .from('email_templates')
      .select('*, requirement:requirement_id(title, type)')
      .order('sort_order'),
    supabase.from('requirements').select('id, title, type').order('sort_order'),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Templates</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create reusable email templates. Optionally link a template to a requirement so it appears as a quick-send button on the candidate checklist.
        Use <code className="bg-gray-100 px-1 rounded text-xs">{'{{candidate_name}}'}</code> and{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">{'{{candidate_email}}'}</code> as variables.
      </p>

      {params.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{params.error}</div>
      )}

      {/* Create form */}
      <form action={createEmailTemplate} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">New Email Template</h2>
        <input
          name="name"
          placeholder="Template name (e.g. Welcome email) *"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          name="subject"
          placeholder="Subject line *"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          name="body"
          placeholder="Email body... Use {{candidate_name}} and {{candidate_email}} for variables."
          required
          rows={5}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Link to requirement (optional)</label>
          <select
            name="requirement_id"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None (standalone template)</option>
            {(requirements ?? []).map((r: any) => (
              <option key={r.id} value={r.id}>
                [{r.type}] {r.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Create Template
        </button>
      </form>

      {/* Template list */}
      {!templates?.length ? (
        <p className="text-sm text-gray-400">No email templates yet. Create one above.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {(templates ?? []).map((t: any) => (
            <div key={t.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {t.requirement && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      linked: {t.requirement.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">Subject: {t.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 whitespace-pre-line">{t.body}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                <Link href={`/admin/email-templates/${t.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                  Edit
                </Link>
                <form action={deleteEmailTemplate}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
