'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type TeamMember = { id: string; full_name: string | null; email: string }

export default function DashboardFilter({
  teamMembers,
  currentUserId,
}: {
  teamMembers: TeamMember[]
  currentUserId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('filter') ?? 'me'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', value)
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm text-gray-500">Showing tasks for:</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="me">Me</option>
        <option value="all">Everyone</option>
        {teamMembers.filter((m) => m.id !== currentUserId).map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name ?? m.email}
          </option>
        ))}
      </select>
    </div>
  )
}
