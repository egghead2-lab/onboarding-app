'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string
  title: string
  completed: boolean
  due_date: string | null
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
    }).select().single()

    if (data) {
      setTasks(prev => [data, ...prev])
      setTitle('')
      setDueDate('')
    }
    setAdding(false)
  }

  return (
    <>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Tasks</h2>
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

      {tasks.length ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggle(task)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
              >
                {task.completed && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <p className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
              {task.due_date && (
                <span className="text-xs text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No tasks yet.</p>
      )}
    </>
  )
}
