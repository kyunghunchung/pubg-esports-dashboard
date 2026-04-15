/**
 * Twitch Helix API — Client Credentials Flow
 * 앱 액세스 토큰을 메모리에 캐싱, 만료 1분 전 자동 갱신
 */

interface TwitchToken {
  access_token: string
  expires_at: number  // unix ms
}

interface TwitchStream {
  user_login: string
  user_name: string
  viewer_count: number
  started_at: string
  type: string  // 'live' | ''
}

let cachedToken: TwitchToken | null = null

async function getAppToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type:    'client_credentials',
    }),
  })

  if (!res.ok) throw new Error(`Twitch token error: ${res.status} ${await res.text()}`)

  const json = await res.json()
  cachedToken = {
    access_token: json.access_token,
    expires_at:   now + json.expires_in * 1000,
  }
  return cachedToken.access_token
}

export async function getLiveStreams(channels: string[]): Promise<TwitchStream[]> {
  if (!channels.length) return []

  const token    = await getAppToken()
  const clientId = process.env.TWITCH_CLIENT_ID!

  const params = new URLSearchParams()
  channels.forEach((ch) => params.append('user_login', ch.toLowerCase()))
  params.set('first', '20')

  const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id':     clientId,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error(`Twitch streams error: ${res.status} ${await res.text()}`)

  const json = await res.json()
  return (json.data as TwitchStream[]).filter((s) => s.type === 'live')
}

export async function getChannelVideos(channelLogin: string, count = 5) {
  const token    = await getAppToken()
  const clientId = process.env.TWITCH_CLIENT_ID!

  // 채널 user_id 조회
  const userRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${channelLogin}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId } }
  )
  const userJson = await userRes.json()
  const userId   = userJson.data?.[0]?.id
  if (!userId) return []

  const res = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${userId}&first=${count}&type=archive`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId } }
  )
  const json = await res.json()
  return json.data ?? []
}
