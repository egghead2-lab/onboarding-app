import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeamMemberRow from './TeamMemberRow'
import CopyInviteLinkButton from './CopyInviteLinkButton'
import InviteForm from './InviteForm'
import DeleteProfileButton from './DeleteProfileButton'

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-red-100 text-red-700',
  team:      'bg-blue-100 text-blue-700',
  candidate: 'bg-gray-100 text-gray-600',
}

export default async function TeamPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [{ data: allProfiles }, { data: { users: allAuthUsers } }] = await Promise.all([
    adminClient.from('profiles').select('id, full_name, email, role, staff_role').order('role').order('full_name'),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const authIdSet = new Set(allAuthUsers.map(u => u.id))

  const members = allProfiles?.filter(p => ['admin', 'team'].includes(p.role)) ?? []
  const allOthers = allProfiles?.filter(p => !['admin', 'team'].includes(p.role)) ?? []

  const pendingInvites = allAuthUsers.filter(u =>
    u.invited_at &&
    !u.email_confirmed_at &&
    !u.confirmed_at &&
    (u.raw_user_meta_data?.role === 'team' || u.raw_user_meta_data?.role === 'admin')
  )

  const STAFF_ROLES = [
    { value: 'onboarder', label: 'Onboarder' },
    { value: 'trainer',   label: 'Trainer' },
    { value: 'scheduler', label: 'Scheduler' },
    { value: 'other',     label: 'Other' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
      </div>

      <InviteForm />

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pending Invites <span className="font-normal text-gray-400">({pendingInvites.length})</span>
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pendingInvites.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.raw_user_meta_data?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <CopyInviteLinkButton email={u.email!} />
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">invite pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff team */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Staff</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">App Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Staff Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <TeamMemberRow key={m.id} member={m} staffRoles={STAFF_ROLES} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All profiles — full visibility for cleanup */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          All App Profiles <span className="font-normal text-gray-400">({allProfiles?.length ?? 0})</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Staff Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Auth</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allProfiles?.map(p => {
                const hasAuth = authIdSet.has(p.id)
                const authUser = allAuthUsers.find(u => u.id === p.id)
                const warnings: string[] = []
                if (!hasAuth) warnings.push('no auth user')
                if (p.role !== 'candidate' && !['admin','team'].includes(p.role)) warnings.push('unknown role')
                return (
                  <tr key={p.id} className={!hasAuth ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 text-gray-900 text-sm">{p.full_name ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.email}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${ROLE_COLORS[p.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {p.staff_role ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {hasAuth ? (
                        <span className="text-xs text-green-600">
                          ✓ {authUser?.email_confirmed_at ? 'confirmed' : 'unconfirmed'}
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 font-medium">⚠ no auth user</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DeleteProfileButton id={p.id} label={p.email} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
