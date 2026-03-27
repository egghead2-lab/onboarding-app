'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LANGUAGES, TSHIRT_SIZES, DAYS, TIME_SLOTS, PRONOUNS } from '@/lib/constants'

export default function ProfileForm({ candidate, details, isFirst }: { candidate: any; details: any; isFirst?: boolean }) {
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  function toggleSlot(day: string, slot: string) {
    setAvailability((prev) => {
      const current = prev[day] ?? []
      if (slot === 'Unavailable') return { ...prev, [day]: ['Unavailable'] }
      const filtered = current.filter((s) => s !== 'Unavailable')
      return {
        ...prev,
        [day]: filtered.includes(slot)
          ? filtered.filter((s) => s !== slot)
          : [...filtered, slot],
      }
    })
  }

  function addOutOfTownDate(date: string) {
    if (!date || outOfTownDates.includes(date) || outOfTownDates.length >= 10) return
    setOutOfTownDates((prev) => [...prev, date].sort())
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    await supabase.from('candidates').update({ phone: phone || null }).eq('id', candidate.id)

    const allLanguages = [
      ...languages.filter((l) => ['Spanish', 'Mandarin'].includes(l)),
      ...(otherLanguage.trim() ? [otherLanguage.trim()] : []),
    ]

    const originalAvailability = JSON.stringify(details?.availability ?? {})
    const newAvailability = JSON.stringify(availability)
    const availabilityChanged = originalAvailability !== newAvailability

    await supabase.from('candidate_details').upsert({
      candidate_id: candidate.id,
      preferred_pronouns: pronouns || null,
      address: address || null,
      tshirt_size: tshirt || null,
      languages: allLanguages,
      out_of_town_dates: outOfTownDates,
      availability,
      availability_changed: availabilityChanged ? true : (details?.availability_changed ?? false),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'candidate_id' })

    setSaving(false)
    if (isFirst) {
      window.location.href = '/portal'
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={candidate.full_name} disabled className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={candidate.email} disabled className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Pronouns</label>
            <select
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {PRONOUNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">T-Shirt Size</label>
          <select
            value={tshirt}
            onChange={(e) => setTshirt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </section>

      {/* Languages */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Languages (other than English)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {LANGUAGES.map((lang) => (
            <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${languages.includes(lang) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {lang}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Other:</span>
          <input
            value={otherLanguage}
            onChange={(e) => setOtherLanguage(e.target.value)}
            placeholder="Type language..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Out of Town Dates */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Out of Town Dates</h3>
        <p className="text-xs text-gray-500 mb-3">Add up to 10 dates you'll be unavailable.</p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={pendingDate}
            onChange={(e) => setPendingDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => { addOutOfTownDate(pendingDate); setPendingDate('') }}
            disabled={!pendingDate || outOfTownDates.length >= 10}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-40"
          >
            Add
          </button>
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
      </section>

      {/* Availability */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Weekly Availability</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 w-28">Day</th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot} className="text-center py-2 px-2 font-medium text-gray-600">{slot}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DAYS.map((day) => (
                <tr key={day}>
                  <td className="py-2 pr-4 font-medium text-gray-700">{day}</td>
                  {TIME_SLOTS.map((slot) => {
                    const selected = (availability[day] ?? []).includes(slot)
                    return (
                      <td key={slot} className="text-center py-2 px-2">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, slot)}
                          className={`w-6 h-6 rounded border-2 mx-auto flex items-center justify-center transition-colors ${
                            selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isFirst ? 'Save & Continue →' : 'Save Profile'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  )
}
