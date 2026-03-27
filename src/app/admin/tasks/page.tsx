import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, candidate:candidate_id(full_name, id)')
    .eq('completed', false)
    .order('due_date', { ascending: true, nullsFirst: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Open Tasks</h1>

      {!tasks?.length ? (
        <p className="text-sm text-gray-500">No open tasks.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <Link href={`/admin/candidates/${task.candidate?.id}`} className="text-xs text-blue-600 hover:underline">
                  {task.candidate?.full_name}
                </Link>
              </div>
              {task.due_date && (
                <span className={`text-xs px-2 py-0.5 rounded ${new Date(task.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
