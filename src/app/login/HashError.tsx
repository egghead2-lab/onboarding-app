'use client'

import { useEffect, useState } from 'react'

export default function HashError() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const error = hash.get('error_description') ?? hash.get('error')
    if (error) {
      const isExpired = error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')
      setMessage(isExpired
        ? 'Your invite link has expired. Please contact your admin to resend it.'
        : error)
    }
  }, [])

  if (!message) return null

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm">
      {message}
    </div>
  )
}
