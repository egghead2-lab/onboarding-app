import { createClient } from '@/lib/supabase/server'
import { getAreas, getSheetRows, type AreaRow } from '@/lib/sheets'
import Link from 'next/link'
import CandidateRow from './CandidateRow'
import CandidateSearch from './CandidateSearch'

const TABLE_HEADERS = (
  <thead className="bg-gray-50 border-b border-gray-200">
    <tr>
      <th className="text-left px-3 py-3 font-medium text-gray-600">Name</th>
      <th className="text-left px-3 py-3 font-medium text-gray-600">Area</th>
      <th className="text-left px-3 py-3 font-medium text-gray-600">Status</th>
      <th className="text-left px-3 py-3 font-medium text-gray-600">Onboarder / Trainer</th>
      <th className="text-left px-3 py-3 font-medium text-gray-600">First Class Date</th>
      <th className="px-3 py-3"></th>
    </tr>
  </thead>
)

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; showCompleted?: string }>
}) {
  const supabase = await createClient()
  const { search = '', showCompleted } = await searchParams

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('candidates')
    .select(`
      *,
      candidate_details(availability_changed),
      messages(id, is_read, sender_id),
      candidate_requirements(
        id, due_date, status, completed,
        requirement:requirement_id(title, type),
        assignee:assigned_to(full_name)
      )
    `)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const [{ data: candidates }, { data: teamMembers }, areas, sheetRows] = await Promise.all([
    query,
    supabase.from('profiles').select('id, full_name, email, staff_role').in('role', ['admin', 'team']).order('full_name'),
    getAreas(),
    getSheetRows(),
  ])

  const pending = candidates?.filter((c: any) => !c.accepted_at) ?? []

  const active = (candidates?.filter((c: any) => c.accepted_at && c.status !== 'complete' && c.status !== 'rejected') ?? [])
    .sort((a: any, b: any) => {
      if (!a.first_class_date && !b.first_class_date) return 0
      if (!a.first_class_date) return 1
      if (!b.first_class_date) return -1
      return new Date(a.first_class_date).getTime() - new Date(b.first_class_date).getTime()
    })

  const completed = candidates?.filter((c: any) => c.accepted_at && c.status === 'complete') ?? []
  const rejected = candidates?.filter((c: any) => c.status === 'rejected') ?? []

  function unreadCount(c: any) {
    return c.messages?.filter((m: any) => !m.is_read && m.sender_id === c.profile_id).length ?? 0
  }

  function overdueReqs(c: any) {
    return (c.candidate_requirements ?? []).filter(
      (r: any) => !r.completed && r.due_date && r.due_date < today
    ).sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))
  }

  function rowProps(c: any) {
    const days = c.first_class_date ? daysUntil(c.first_class_date) : null
    const approaching = days !== null && days >= 0 && days <= 7
    const allReqs = (c.candidate_requirements ?? []).sort((a: any, b: any) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
    return { candidate: c, teamMembers: teamMembers ?? [], areas, sheetRows, unreadCount: unreadCount(c), approaching, overdueRequirements: overdueReqs(c), allRequirements: allReqs }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <div className="flex items-center gap-3">
          <CandidateSearch defaultValue={search} />
          <Link href="/admin/candidates/new" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Add Candidate
          </Link>
        </div>
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pending Invites <span className="text-gray-400 font-normal">({pending.length})</span>
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {pending.map((c: any) => (
              <Link key={c.id} href={`/admin/candidates/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.full_name}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">invite pending</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active candidates */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Active <span className="text-gray-400 font-normal">({active.length})</span>
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {!active.length ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No active candidates{search ? ' matching your search' : ''}.
            </div>
          ) : (
            <table className="w-full text-sm">
              {TABLE_HEADERS}
              <tbody>
                {active.map((c: any) => (
                  <CandidateRow key={c.id} {...rowProps(c)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Completed candidates */}
      {completed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Completed <span className="text-gray-400 font-normal">({completed.length})</span>
            </h2>
            <Link
              href={`/admin/candidates?${new URLSearchParams({ ...(search ? { search } : {}), ...(showCompleted ? {} : { showCompleted: '1' }) }).toString()}`}
              className="text-xs text-blue-600 hover:underline"
            >
              {showCompleted ? 'Hide' : 'Show'}
            </Link>
          </div>
          {showCompleted && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden opacity-75">
              <table className="w-full text-sm">
                {TABLE_HEADERS}
                <tbody>
                  {completed.map((c: any) => (
                    <CandidateRow key={c.id} {...rowProps(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rejected/Resigned candidates */}
      {rejected.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Rejected / Resigned <span className="text-gray-400 font-normal">({rejected.length})</span>
            </h2>
            {!showCompleted && (
              <Link href={`/admin/candidates?${new URLSearchParams({ ...(search ? { search } : {}), showCompleted: '1' }).toString()}`} className="text-xs text-blue-600 hover:underline">Show</Link>
            )}
          </div>
          {showCompleted && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden opacity-75">
              <table className="w-full text-sm">
                {TABLE_HEADERS}
                <tbody>
                  {rejected.map((c: any) => (
                    <CandidateRow key={c.id} {...rowProps(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
