import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardFilter from './DashboardFilter'

const typeColors: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { filter = 'me' } = await searchParams
  const assignedTo = filter === 'me' ? user.id : filter === 'all' ? null : filter

  const today = new Date().toISOString().split('T')[0]

  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, due_date, candidate:candidate_id(id, full_name)')
    .eq('completed', false)
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .order('due_date')

  if (assignedTo) tasksQuery = tasksQuery.eq('assigned_to', assignedTo)

  const [
    { count: totalCandidates },
    { count: pendingCount },
    { count: openReqs },
    { count: openTasks },
    { data: overdueReqs },
    { data: overdueTasks },
    { data: teamMembers },
  ] = await Promise.all([
    supabase.from('candidates').select('*', { count: 'exact', head: true }).not('accepted_at', 'is', null),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).is('accepted_at', null),
    supabase.from('candidate_requirements').select('*', { count: 'exact', head: true }).eq('completed', false),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
    supabase
      .from('candidate_requirements')
      .select('id, due_date, candidate:candidate_id(id, full_name, onboarder_id, trainer_id), requirement:requirement_id(title, type, sort_order)')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .order('due_date'),
    tasksQuery,
    supabase.from('profiles').select('id, full_name, email').in('role', ['admin', 'team']).order('full_name'),
  ])

  const stats = [
    { label: 'Active Candidates', value: totalCandidates ?? 0, href: '/admin/candidates' },
    { label: 'Pending Invites', value: pendingCount ?? 0, href: '/admin/candidates' },
    { label: 'Open Requirements', value: openReqs ?? 0, href: '/admin/candidates' },
    { label: 'Open Tasks', value: openTasks ?? 0, href: '/admin/tasks' },
  ]

  function matchesFilter(r: any) {
    if (!assignedTo) return true
    const c = r.candidate
    const type = r.requirement?.type
    if (type === 'onboarding') return c?.onboarder_id === assignedTo
    if (type === 'training') return c?.trainer_id === assignedTo
    return false
  }

  const filteredReqs = overdueReqs?.filter(matchesFilter) ?? []
  const overdueOnboarding = filteredReqs.filter((r: any) => r.requirement?.type === 'onboarding')
  const overdueTraining = filteredReqs.filter((r: any) => r.requirement?.type === 'training')
  const filteredTasks = overdueTasks ?? []
  const hasOverdue = overdueOnboarding.length > 0 || overdueTraining.length > 0 || filteredTasks.length > 0

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Filter */}
      <DashboardFilter teamMembers={teamMembers ?? []} currentUserId={user.id} />

      {/* Overdue section */}
      {!hasOverdue ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400 mb-8">
          No overdue items {filter === 'me' ? 'assigned to you' : filter === 'all' ? '' : 'for this person'}.
        </div>
      ) : (
        <div className="space-y-6 mb-8">

          {/* Overdue requirements */}
          {(overdueOnboarding.length > 0 || overdueTraining.length > 0) && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Overdue Requirements
                <span className="ml-2 text-sm font-normal text-red-500">({filteredReqs.length})</span>
              </h2>
              <div className="space-y-4">
                {[{ label: 'Onboarding', items: overdueOnboarding, type: 'onboarding' }, { label: 'Training', items: overdueTraining, type: 'training' }].map(({ label, items, type }) =>
                  items.length > 0 ? (
                    <div key={type}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h3>
                      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                        {items.map((r: any) => {
                          const daysOverdue = Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / 86400000)
                          return (
                            <Link
                              key={r.id}
                              href={`/admin/candidates/${r.candidate?.id}`}
                              className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">{r.candidate?.full_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{r.requirement?.title}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[type]}`}>{label}</span>
                                <span className="text-xs text-red-600 font-medium">{daysOverdue}d overdue</span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Overdue tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Overdue Tasks
                <span className="ml-2 text-sm font-normal text-red-500">({filteredTasks.length})</span>
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                {filteredTasks.map((t: any) => {
                  const daysOverdue = Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / 86400000)
                  return (
                    <Link
                      key={t.id}
                      href={`/admin/candidates/${t.candidate?.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.candidate?.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.title}</p>
                      </div>
                      <span className="text-xs text-red-600 font-medium flex-shrink-0">{daysOverdue}d overdue</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/admin/candidates/new" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
          Add Candidate
        </Link>
        <Link href="/admin/requirements" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">
          Manage Requirements
        </Link>
      </div>
    </div>
  )
}
