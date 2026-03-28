'use client'

import { useState } from 'react'
import { updateStaffRole, deleteTeamMember } from './actions'
import { useRouter } from 'next/navigation'

const STAFF_ROLE_COLORS: Record<string, string> = {
  onboarder: 'bg-purple-100 text-purple-700',
  trainer:   'bg-green-100 text-green-700',
  scheduler: 'bg-blue-100 text-blue-700',
  other:     'bg-gray-100 text-gray-600',
}

export default function TeamMemberRow({
  member,
  staffRoles,
}: {
  member: { id: string; full_name: string | null; email: string; role: string; staff_role: string | null }
  staffRoles: { value: string; label: string }[]
}) {
  const [staffRole, setStaffRole] = useState(member.staff_role ?? '')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleStaffRoleChange(value: string) {
    setStaffRole(value)
    await updateStaffRole(member.id, value || null)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${member.full_name ?? member.email} from the team?`)) return
    setDeleting(true)
    await deleteTeamMember(member.id)
    router.refresh()
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{member.full_name ?? '—'}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{member.email}</td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{member.role}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {staffRole && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STAFF_ROLE_COLORS[staffRole] ?? 'bg-gray-100 text-gray-600'}`}>
              {staffRole}
            </span>
          )}
          <select
            value={staffRole}
            onChange={e => handleStaffRoleChange(e.target.value)}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          >
            <option value="">— unassigned —</option>
            {staffRoles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Remove from team"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
