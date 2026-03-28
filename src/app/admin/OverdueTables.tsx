'use client'

import { useRouter } from 'next/navigation'

const typeColors: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

const reqStatusColors: Record<string, string> = {
  not_started:        'bg-gray-100 text-gray-600',
  instructions_sent:  'bg-blue-100 text-blue-700',
  awaiting_candidate: 'bg-amber-100 text-amber-700',
  action_needed:      'bg-red-100 text-red-700',
}

const reqStatusLabels: Record<string, string> = {
  not_started:        'Not Started',
  instructions_sent:  'Instructions Sent',
  awaiting_candidate: 'Awaiting Candidate',
  action_needed:      'Action Needed',
}

export function OverdueReqsTable({ reqs }: { reqs: any[] }) {
  const router = useRouter()
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {reqs.map((r) => {
            const daysOverdue = Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / 86400000)
            const type = r.requirement?.type ?? ''
            const status = r.status ?? 'not_started'
            return (
              <tr
                key={r.id}
                className="hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/candidates/${r.candidate?.id}`)}
              >
                <td className="px-4 py-2 font-medium text-gray-900 w-1/4">{r.candidate?.full_name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.requirement?.title}</td>
                <td className="px-3 py-2 whitespace-nowrap w-24">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[type] ?? 'bg-gray-100 text-gray-500'}`}>{type}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap w-36">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${reqStatusColors[status]}`}>{reqStatusLabels[status]}</span>
                </td>
                <td className="px-3 py-2 text-xs text-red-600 font-medium whitespace-nowrap w-24 text-right">{daysOverdue}d overdue</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function OverdueTasksTable({ tasks }: { tasks: any[] }) {
  const router = useRouter()
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {tasks.map((t) => {
            const daysOverdue = Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / 86400000)
            return (
              <tr
                key={t.id}
                className="hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/candidates/${t.candidate?.id}`)}
              >
                <td className="px-4 py-2 font-medium text-gray-900 w-1/4">{t.candidate?.full_name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{t.title}</td>
                <td className="px-3 py-2 text-xs text-red-600 font-medium whitespace-nowrap w-24 text-right">{daysOverdue}d overdue</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
