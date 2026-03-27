'use client'

import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

export default function DeleteRequirementButton({
  id,
  action,
}: {
  id: string
  action: (formData: FormData) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(false)
    const formData = new FormData()
    formData.set('id', id)
    await action(formData)
  }

  return (
    <>
      <button
        type="button"
        className="text-xs text-red-500 hover:underline"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
      {confirming && (
        <ConfirmDialog
          message="Delete this requirement? It will be removed from all candidates."
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
