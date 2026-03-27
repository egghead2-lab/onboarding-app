'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadButton({
  candidateId,
  requirementId,
  userId,
}: {
  candidateId: string
  requirementId: string
  userId: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const path = `${userId}/${candidateId}/${requirementId}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    // Save document record
    await supabase.from('documents').insert({
      candidate_id: candidateId,
      requirement_id: requirementId,
      file_name: file.name,
      storage_path: path,
    })

    setDone(true)
    setUploading(false)
    // Refresh the page to show the uploaded doc
    window.location.reload()
  }

  if (done) return <p className="text-xs text-green-600">Uploaded!</p>

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload document'}
      </button>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
