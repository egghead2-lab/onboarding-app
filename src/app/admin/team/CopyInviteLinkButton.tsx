'use client'

import { useState } from 'react'
import { generateInviteLink } from './actions'

export default function CopyInviteLinkButton({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')

  async function handleClick() {
    setStatus('loading')
    try {
      const link = await generateInviteLink(email)
      await navigator.clipboard.writeText(link)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {status === 'loading' ? 'Generating…' : status === 'copied' ? 'Copied!' : status === 'error' ? 'Failed' : 'Copy invite link'}
    </button>
  )
}
