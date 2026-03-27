'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LANGUAGES, TSHIRT_SIZES, DAYS, TIME_SLOTS, PRONOUNS, TRAINING_TYPES } from '@/lib/constants'

type SheetData = {
  rows: { area: string; trainer: string; fieldManager: string; scheduler: string }[]
  trainers: string[]
  fieldManagers: string[]
  schedulers: string[]
}

type TeamMember = { id: string; full_name: string | null; email: string }

export default function AdminProfileForm({
  candidate,
  details,
  areas,
  teamMembers,
}: {
  candidate: any
  details: any
  areas: string[]
  teamMembers: TeamMember[]
}) {
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [phone, setPhone] = useState(candidate.phone ?? '')
  const [pronouns, setPronouns] = useState(details?.preferred_pronouns ?? '')
  const [address, setAddress] = useState(details?.address ?? '')
  const [tshirt, setTshirt] = useState(details?.tshirt_size ?? '')
  const [languages, setLanguages] = useState<string[]>(details?.languages ?? [])
  const [otherLanguage, setOtherLanguage] = useState(
    details?.languages?.find((l: string) => !['Spanish', 'Mandarin'].includes(l)) ?? ''
  )
  const [outOfTownDates, setOutOfTownDates] = useState<string[]>(details?.out_of_town_dates ?? [])
  const [pendingDate, setPendingDate] = useState('')
  const [availability, setAvailability] = useState<Record<string, string[]>>(details?.availability ?? {})
  const [area, setArea] = useState(candidate.area ?? '')
  const [trainer, setTrainer] = useState(candidate.trainer ?? '')
  const [fieldManager, setFieldManager] = useState(candidate.field_manager ?? '')
  const [scheduler, setScheduler] = useState(candidate.scheduler ?? '')
  const [firstClassDate, setNeededHireDate] = useState(candidate.first_class_date ?? '')
  const [trainingTypes, setTrainingTypes] = useState<string[]>(candidate.training_types ?? [])
  const [onboarderId, setOnboarderId] = useState(candidate.onboarder_id ?? '')
  const [trainerId, setTrainerId] = useState(candidate.trainer_id ?? '')
  const [payRate, setPayRate] = useState(candidate.pay_rate ?? '')
  const [trainingType, setTrainingType] = useState(candidate.training_type ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/sheets').then((r) => r.json()).then(setSheetData)
  }, [])

  function matchTrainerToProfile(trainerName: string) {
    const match = teamMembers.find(m => m.full_name === trainerName)
    setTrainerId(match?.id ?? '')
  }

  function handleAreaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value
    setArea(selected)
    if (!selected || !sheetData) return
    const match = sheetData.rows.find((r) => r.area === selected)
    if (match) {
      setTrainer(match.trainer)
      setFieldManager(match.fieldManager)
      setScheduler(match.scheduler)
      matchTrainerToProfile(match.trainer)
    }
  }

  function handleTrainerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTrainer(e.target.value)
    matchTrainerToProfile(e.target.value)
  }

  function toggleTrainingType(type: string) {
    setTrainingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function toggleLanguage(lang: string) {
    setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang])
  }

  function toggleSlot(day: string, slot: string) {
    setAvailability((prev) => {
      const current = prev[day] ?? []
      if (slot === 'Unavailable') return { ...prev, [day]: ['Unavailable'] }
      const filtered = current.filter((s) => s !== 'Unavailable')
      return { ...prev, [day]: filtered.includes(slot) ? filtered.filter((s) => s !== slot) : [...filtered, slot] }
    })
  }

  function addOutOfTownDate(date: string) {
    if (!date || outOfTownDates.includes(date) || outOfTownDates.length >= 10) return
    setOutOfTownDates((prev) => [...prev, date].sort())
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()

    const { error: candidateError } = await supabase.from('candidates').update({
      phone: phone || null,
      area: area || null,
      trainer: trainer || null,
      field_manager: fieldManager || null,
      scheduler: scheduler || null,
      first_class_date: firstClassDate || null,
      training_types: trainingTypes,
      onboarder_id: onboarderId || null,
      trainer_id: trainerId || null,
      pay_rate: payRate !== '' ? Number(payRate) : null,
      training_type: trainingType || null,
    }).eq('id', candidate.id)

    if (candidateError) {
      alert('Error saving: ' + candidateError.message)
      setSaving(false)
      return
    }

    // Auto-assign requirements and calculate due dates
    const { data: candReqs } = await supabase
      .from('candidate_requirements')
      .select('id, requirement:requirement_id(type, due_offset_days)')
      .eq('candidate_id', candidate.id)

    for (const cr of candReqs ?? []) {
      const req = cr.requirement as any
      const updates: Record<string, any> = {}
      if (req?.type === 'onboarding' && onboarderId) updates.assigned_to = onboarderId
      if (req?.type === 'training' && trainerId) updates.assigned_to = trainerId
      if (firstClassDate && req?.due_offset_days != null) {
        const d = new Date(firstClassDate)
        d.setDate(d.getDate() + req.due_offset_days)
        updates.due_date = d.toISOString().split('T')[0]
      }
      if (Object.keys(updates).length) {
        await supabase.from('candidate_requirements').update(updates).eq('id', cr.id)
      }
    }

    const allLanguages = [
      ...languages.filter((l) => ['Spanish', 'Mandarin'].includes(l)),
      ...(otherLanguage.trim() ? [otherLanguage.trim()] : []),
    ]

    await supabase.from('candidate_details').upsert({
      candidate_id: candidate.id,
      preferred_pronouns: pronouns || null,
      address: address || null,
      tshirt_size: tshirt || null,
      languages: allLanguages,
      out_of_town_dates: outOfTownDates,
      availability,
      availability_changed: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'candidate_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Candidate info — editable by admin */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Candidate Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Pronouns</label>
            <select value={pronouns} onChange={(e) => setPronouns(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option>
              {PRONOUNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">T-Shirt Size</label>
          <select value={tshirt} onChange={(e) => setTshirt(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select...</option>
            {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Languages (other than English)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {LANGUAGES.map((lang) => (
              <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${languages.includes(lang) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {lang}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Other:</span>
            <input value={otherLanguage} onChange={(e) => setOtherLanguage(e.target.value)} placeholder="Type language..."
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Out of Town Dates</label>
          <div className="flex gap-2 mb-2">
            <input type="date" value={pendingDate} onChange={(e) => setPendingDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => { addOutOfTownDate(pendingDate); setPendingDate('') }} disabled={!pendingDate || outOfTownDates.length >= 10}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-40">Add</button>
            <span className="text-xs text-gray-400 self-center">{outOfTownDates.length}/10</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfTownDates.map((date) => (
              <span key={date} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {new Date(date + 'T00:00:00').toLocaleDateString()}
                <button type="button" onClick={() => setOutOfTownDates((prev) => prev.filter((d) => d !== date))} className="text-gray-400 hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Availability</label>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-1 pr-4 font-medium text-gray-600 w-24">Day</th>
                {TIME_SLOTS.map((slot) => <th key={slot} className="text-center py-1 px-2 font-medium text-gray-600 text-xs">{slot}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DAYS.map((day) => (
                <tr key={day}>
                  <td className="py-1 pr-4 font-medium text-gray-700 text-sm">{day}</td>
                  {TIME_SLOTS.map((slot) => {
                    const selected = (availability[day] ?? []).includes(slot)
                    return (
                      <td key={slot} className="text-center py-1 px-2">
                        <button type="button" onClick={() => toggleSlot(day, slot)}
                          className={`w-5 h-5 rounded border-2 mx-auto flex items-center justify-center transition-colors ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400'}`}>
                          {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin-only fields */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assignment (Admin Only)</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
          <select
            value={area}
            onChange={handleAreaChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select area...</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
            <select value={trainer} onChange={handleTrainerChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option>
              {sheetData?.trainers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {trainer && (
              <p className="text-xs mt-1 text-gray-400">
                {trainerId
                  ? `Matched to: ${teamMembers.find(m => m.id === trainerId)?.full_name}`
                  : 'No internal account match — task assignment will be unset'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Manager</label>
            <select value={fieldManager} onChange={(e) => setFieldManager(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option>
              {sheetData?.fieldManagers.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduler</label>
            <select value={scheduler} onChange={(e) => setScheduler(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option>
              {sheetData?.schedulers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Class Date</label>
          <input
            type="date"
            value={firstClassDate}
            onChange={(e) => setNeededHireDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Onboarder</label>
          <select value={onboarderId} onChange={(e) => setOnboarderId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select...</option>
            {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Pay Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payRate}
                onChange={e => setPayRate(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Training Type</label>
            <select
              value={trainingType}
              onChange={e => setTrainingType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="In Class Observations">In Class Observations</option>
              <option value="No In Class Observations">No In Class Observations</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Training Types Needed</label>
          <div className="flex gap-2">
            {TRAINING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleTrainingType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  trainingTypes.includes(type)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  )
}
