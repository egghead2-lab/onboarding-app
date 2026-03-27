import { google, gmail_v1 } from 'googleapis'

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

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined | null): { text: string; html: string } {
  let text = ''
  let html = ''

  function walk(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/plain' && part.body?.data && !text) {
      text = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    if (part.mimeType === 'text/html' && part.body?.data && !html) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    for (const p of part.parts ?? []) walk(p)
  }

  if (payload) walk(payload)
  return { text, html }
}

export async function fetchThreadMessages(
  threadId: string,
  accessToken: string,
  refreshToken: string | null
) {
  const client = getOAuthClient()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const gmail = google.gmail({ version: 'v1', auth: client })

  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  })

  return (thread.data.messages ?? []).map(msg => {
    const headers = msg.payload?.headers ?? []
    const get = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

    const { text, html } = extractBody(msg.payload)

    return {
      id: msg.id ?? '',
      threadId: msg.threadId ?? '',
      from: get('From'),
      to: get('To'),
      subject: get('Subject'),
      date: get('Date'),
      text,
      html,
      internalDate: msg.internalDate ?? '0',
    }
  })
}

export async function sendEmail({
  accessToken,
  refreshToken,
  to,
  subject,
  body,
  threadId,
  attachments,
}: {
  accessToken: string
  refreshToken: string | null
  to: string
  subject: string
  body: string
  threadId?: string | null
  attachments?: Array<{ name: string; mimeType: string; data: Buffer }>
}) {
  const client = getOAuthClient()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const gmail = google.gmail({ version: 'v1', auth: client })

  let encoded: string

  if (!attachments?.length) {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n')
    encoded = Buffer.from(message).toString('base64url')
  } else {
    const boundary = `boundary_${Date.now()}`
    const parts: string[] = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ]
    for (const att of attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.name}"`,
        `Content-Disposition: attachment; filename="${att.name}"`,
        'Content-Transfer-Encoding: base64',
        '',
        att.data.toString('base64'),
      )
    }
    parts.push(`--${boundary}--`)
    encoded = Buffer.from(parts.join('\r\n')).toString('base64url')
  }

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      ...(threadId ? { threadId } : {}),
    },
  })

  return res.data
}
