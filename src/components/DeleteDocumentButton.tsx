'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from './ConfirmDialog'

export default function DeleteDocumentButton({
  documentId,
  storagePath,
  onDeleted,
}: {
  documentId: string
  storagePath: string
  onDeleted?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setConfirming(false)
    setDeleting(true)
    const supabase = createClient()
    await supabase.storage.from('documents').remove([storagePath])
    await supabase.from('documents').delete().eq('id', documentId)
    setDeleting(false)
    if (onDeleted) onDeleted()
    else window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={deleting}
        className="text-red-400 hover:text-red-600 disabled:opacity-50 ml-1 leading-none"
        title="Delete document"
      >
        ×
      </button>
      {confirming && (
        <ConfirmDialog
          message="Delete this document? This cannot be undone."
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
