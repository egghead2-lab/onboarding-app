import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

async function updateEmailTemplate(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  await supabase.from('email_templates').update({
    name: formData.get('name') as string,
    subject: formData.get('subject') as string,
    body: formData.get('body') as string,
    requirement_id: (formData.get('requirement_id') as string) || null,
  }).eq('id', id)
  redirect(`/admin/email-templates`)
}

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: template }, { data: requirements }] = await Promise.all([
    supabase.from('email_templates').select('*').eq('id', id).single(),
    supabase.from('requirements').select('id, title, type').order('sort_order'),
  ])

  if (!template) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/email-templates" className="text-sm text-gray-500 hover:underline">
        ← Email Templates
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">Edit Email Template</h1>

      <form action={updateEmailTemplate} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Template name *</label>
          <input
            name="name"
            defaultValue={template.name}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
          <input
            name="subject"
            defaultValue={template.subject}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Body *{' '}
            <span className="text-gray-400 font-normal">
              — use <code className="bg-gray-100 px-1 rounded">{'{{candidate_name}}'}</code> and{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{candidate_email}}'}</code>
            </span>
          </label>
          <textarea
            name="body"
            defaultValue={template.body}
            required
            rows={10}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Linked requirement (optional)</label>
          <select
            name="requirement_id"
            defaultValue={template.requirement_id ?? ''}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None (standalone)</option>
            {(requirements ?? []).map((r: any) => (
              <option key={r.id} value={r.id}>
                [{r.type}] {r.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Save Changes
          </button>
          <Link
            href="/admin/email-templates"
            className="px-4 py-2 rounded-md text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
