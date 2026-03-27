'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AcknowledgeButton({ candidateId }: { candidateId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleAcknowledge() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('candidate_details')
      .update({ availability_changed: false })
      .eq('candidate_id', candidateId)
    window.location.reload()
  }

  return (
    <button
      onClick={handleAcknowledge}
      disabled={loading}
      className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
    >
      {loading ? 'Saving...' : 'Acknowledge'}
    </button>
  )
}
