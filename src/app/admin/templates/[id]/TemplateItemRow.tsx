'use client'

import { useState } from 'react'

type Props = {
  item: any
  isFirst: boolean
  isLast: boolean
  moveAction: (formData: FormData) => Promise<void>
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}

const typeColors: Record<string, string> = {
  onboarding: 'bg-purple-100 text-purple-700',
  training: 'bg-green-100 text-green-700',
}

function formatOffset(days: number | null) {
  if (days == null) return null
  if (days === 0) return 'On first class date'
  return days < 0 ? `${Math.abs(days)} days before` : `${days} days after`
}

export default function TemplateItemRow({ item, isFirst, isLast, moveAction, updateAction, deleteAction }: Props) {
  const [editing, setEditing] = useState(false)
  const storedOffset = item.due_offset_days
  const initDir = storedOffset != null && storedOffset < 0 ? 'before' : 'after'
  const initVal = storedOffset != null ? Math.abs(storedOffset) : ''

  return (
    <div className="px-4 py-3">
      {editing ? (
        <form action={async (fd) => { await updateAction(fd); setEditing(false) }} className="space-y-2">
          <input type="hidden" name="id" value={item.id} />
          <input name="title" defaultValue={item.title} required
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="description" defaultValue={item.description ?? ''} placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Type</label>
              <select name="type" defaultValue={item.type ?? 'onboarding'}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="onboarding">Onboarding</option>
                <option value="training">Training</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Due date</label>
              <div className="flex gap-1">
                <input name="due_offset_value" type="number" min="0" defaultValue={initVal} placeholder="Days"
                  className="w-16 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select name="due_offset_direction" defaultValue={initDir}
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="before">days before</option>
                  <option value="after">days after</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 px-3 py-1.5 rounded-md text-xs hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <form action={moveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={isFirst} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▲</button>
            </form>
            <form action={moveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={isLast} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▼</button>
            </form>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[item.type ?? 'onboarding']}`}>
                {item.type ?? 'onboarding'}
              </span>
              {formatOffset(item.due_offset_days) && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{formatOffset(item.due_offset_days)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-blue-600">Edit</button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-xs text-gray-400 hover:text-red-500">Delete</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
