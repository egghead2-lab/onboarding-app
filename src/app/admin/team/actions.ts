'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function updateStaffRole(profileId: string, staffRole: string | null) {
  const adminClient = createAdminClient()
  await adminClient.from('profiles').update({ staff_role: staffRole }).eq('id', profileId)
}

export async function deleteTeamMember(profileId: string) {
  const adminClient = createAdminClient()
  // Delete auth user (cascades to profile via DB trigger/FK), fall back to just profile delete
  const { error } = await adminClient.auth.admin.deleteUser(profileId)
  if (error) {
    // Auth user may not exist — delete profile row directly
    await adminClient.from('profiles').delete().eq('id', profileId)
  }
}

export async function generateInviteLink(email: string): Promise<string> {
  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` },
  })

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message ?? 'Failed to generate link')
  }

  return data.properties.action_link
}

export async function createStaffMember(email: string, fullName: string): Promise<string> {
  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Try to create the user; if already exists, look them up instead
  let userId: string
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    user_metadata: { full_name: fullName, role: 'team' },
    email_confirm: true,
  })

  if (createError) {
    if (createError.status !== 422) {
      throw new Error(`createUser failed: ${createError.message} (status: ${createError.status})`)
    }
    // User already exists — look them up by email
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (listError) throw new Error(`Failed to look up existing user: ${listError.message}`)
    const existing = listData.users.find(u => u.email === email)
    if (!existing) throw new Error(`User with ${email} reportedly exists but could not be found`)
    userId = existing.id
  } else {
    if (!userData?.user) throw new Error('createUser returned no user — check service role key')
    userId = userData.user.id
  }

  // Upsert profile
  await adminClient.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName || null,
    role: 'team',
  }, { onConflict: 'id' })

  // Generate invite link for the admin to share manually
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error(linkError?.message ?? 'User created but failed to generate link')
  }

  return linkData.properties.action_link
}

