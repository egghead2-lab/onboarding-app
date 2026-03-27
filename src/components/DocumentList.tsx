'use client'

import { useState } from 'react'
import DeleteDocumentButton from './DeleteDocumentButton'

type Doc = {
  id: string
  file_name: string
  storage_path: string
  signedUrl: string | null
}

export default function DocumentList({ docs }: { docs: Doc[] }) {
  const [list, setList] = useState(docs)

  if (!list.length) return <span className="text-xs text-amber-600 mt-0.5 block">awaiting document</span>

  return (
    <div className="mt-1 space-y-0.5">
      {list.map((doc) => (
        <div key={doc.id} className="flex items-center gap-1">
          <a
            href={doc.signedUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {doc.file_name}
          </a>
          <DeleteDocumentButton
            documentId={doc.id}
            storagePath={doc.storage_path}
            onDeleted={() => setList((prev) => prev.filter((d) => d.id !== doc.id))}
          />
        </div>
      ))}
    </div>
  )
}
