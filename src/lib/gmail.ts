import { google } from 'googleapis'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })
}

export async function sendEmail({
  accessToken,
  refreshToken,
  to,
  subject,
  body,
  threadId,
}: {
  accessToken: string
  refreshToken: string | null
  to: string
  subject: string
  body: string
  threadId?: string | null
}) {
  const client = getOAuthClient()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const gmail = google.gmail({ version: 'v1', auth: client })

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n')

  const encoded = Buffer.from(message).toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      ...(threadId ? { threadId } : {}),
    },
  })

  return res.data
}
