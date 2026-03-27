'use client'

import { useState, useEffect } from 'react'

type SheetData = {
  rows: { area: string; trainer: string; fieldManager: string; scheduler: string }[]
  trainers: string[]
  fieldManagers: string[]
  schedulers: string[]
}

export default function NewCandidateForm({
  areas,
  action,
}: {
  areas: string[]
  action: (formData: FormData) => Promise<void>
}) {
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [trainer, setTrainer] = useState('')
  const [fieldManager, setFieldManager] = useState('')
  const [scheduler, setScheduler] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/sheets').then((r) => r.json()).then(setSheetData)
  }, [])

  function handleAreaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const area = e.target.value
    if (!area || !sheetData) {
      setTrainer('')
      setFieldManager('')
      setScheduler('')
      return
    }
    const match = sheetData.rows.find((r) => r.area === area)
    if (match) {
      setTrainer(match.trainer)
      setFieldManager(match.fieldManager)
      setScheduler(match.scheduler)
    }
  }

  const selectClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form
      action={action}
      onSubmit={() => setLoading(true)}
      className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input name="full_name" required className={selectClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input name="email" type="email" required className={selectClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input name="phone" type="tel" className={selectClass} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignment</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
          <select name="area" onChange={handleAreaChange} className={selectClass}>
            <option value="">Select area...</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
            <select name="trainer" value={trainer} onChange={(e) => setTrainer(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              {sheetData?.trainers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Manager</label>
            <select name="field_manager" value={fieldManager} onChange={(e) => setFieldManager(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              {sheetData?.fieldManagers.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduler</label>
            <select name="scheduler" value={scheduler} onChange={(e) => setScheduler(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              {sheetData?.schedulers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Adding...' : 'Add Candidate'}
        </button>
        <a href="/admin/candidates" className="px-4 py-2 text-sm text-gray-600 hover:underline">Cancel</a>
      </div>
    </form>
  )
}
