import { getSheetRows, getTrainers, getFieldManagers, getSchedulers } from '@/lib/sheets'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [rows, trainers, fieldManagers, schedulers] = await Promise.all([
    getSheetRows(),
    getTrainers(),
    getFieldManagers(),
    getSchedulers(),
  ])

  return NextResponse.json({ rows, trainers, fieldManagers, schedulers })
}
