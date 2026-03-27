'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string
  title: string
  completed: boolean
  due_date: string | null
  assignee: { full_name: string | null } | null
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function TasksSection({
  initialTasks,
  candidateId,
  currentUserId,
}: {
  initialTasks: Task[]
  candidateId: string
  currentUserId: string
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showCompleted, setShowCompleted] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const supabase = createClient()

  async function toggle(task: Task) {
    const newCompleted = !task.completed
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t))
    await supabase.from('tasks').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq('id', task.id)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    const { data } = await supabase.from('tasks').insert({
      candidate_id: candidateId,
      title: title.trim(),
      due_date: dueDate || null,
      created_by: currentUserId,
    }).select('*, assignee:assigned_to(full_name)').single()

    if (data) {
      setTasks(prev => [data, ...prev])
      setTitle('')
      setDueDate('')
    }
    setAdding(false)
  }

  const outstanding = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)
  const visible = showCompleted ? tasks : outstanding

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Tasks</h2>
        {completed.length > 0 && (
          <button onClick={() => setShowCompleted(s => !s)} className="text-xs text-gray-400 hover:text-gray-600">
            {showCompleted ? 'Hide completed' : `Show ${completed.length} completed`}
          </button>
        )}
      </div>

      <form onSubmit={addTask} className="flex gap-2 mb-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a task..."
          required
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
        />
        <input
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          type="date"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
        />
        <button
          type="submit"
          disabled={adding}
          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {visible.length ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {visible.map(task => {
            const overdue = isOverdue(task.due_date) && !task.completed
            const dueLabel = task.due_date
              ? new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : null

            return (
              <div key={task.id} className="grid items-center gap-3 px-4 py-2" style={{ gridTemplateColumns: '1rem 1fr 8rem 5rem' }}>
                <button
                  onClick={() => toggle(task)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
                >
                  {task.completed && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <p className={`text-sm truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                <span className="text-xs text-gray-400 truncate">{task.assignee?.full_name ?? ''}</span>
                <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                  {overdue ? '⚠ ' : ''}{dueLabel ?? ''}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400">{tasks.length ? 'All tasks complete.' : 'No tasks yet.'}</p>
      )}
    </>
  )
}
