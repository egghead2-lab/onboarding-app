'use client'

import { useState } from 'react'
import { deleteTeamMember } from './actions'
import { useRouter } from 'next/navigation'

export default function DeleteProfileButton({ id, label }: { id: string; label: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Remove ${label}?`)) return
    setDeleting(true)
    await deleteTeamMember(id)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Delete"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
