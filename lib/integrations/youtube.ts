/**
 * YouTube Data API v3
 * - 채널의 라이브 스트림 동시 시청자 수 조회
 * - 영상 통계(views, likes) 조회
 */

const BASE = 'https://www.googleapis.com/youtube/v3'

interface LiveStreamDetails {
  videoId: string
  title: string
  concurrentViewers: number
  scheduledStartTime?: string
  actualStartTime?: string
}

interface VideoStats {
  videoId: string
  title: string
  viewCount: number
  likeCount: number
  commentCount: number
}

async function yt(path: string, params: Record<string, string>) {
  const url = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! })
  const res = await fetch(`${BASE}${path}?${url}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`)
  return res.json()
}

/** 채널의 현재 라이브 스트림 목록 조회 */
export async function getActiveLiveStreams(channelId: string): Promise<LiveStreamDetails[]> {
  // 1. 라이브 중인 영상 ID 검색
  const searchJson = await yt('/search', {
    part:       'snippet',
    channelId,
    eventType:  'live',
    type:       'video',
    maxResults: '10',
  })

  const videoIds: string[] = (searchJson.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId)
  if (!videoIds.length) return []

  // 2. 동시 시청자 수 조회
  const videoJson = await yt('/videos', {
    part: 'liveStreamingDetails,snippet',
    id:   videoIds.join(','),
  })

  return (videoJson.items ?? []).map((item: {
    id: string
    snippet: { title: string }
    liveStreamingDetails: {
      concurrentViewers?: string
      scheduledStartTime?: string
      actualStartTime?: string
    }
  }) => ({
    videoId:            item.id,
    title:              item.snippet.title,
    concurrentViewers:  parseInt(item.liveStreamingDetails?.concurrentViewers ?? '0', 10),
    scheduledStartTime: item.liveStreamingDetails?.scheduledStartTime,
    actualStartTime:    item.liveStreamingDetails?.actualStartTime,
  }))
}

/** 영상 ID 목록의 통계 조회 */
export async function getVideoStats(videoIds: string[]): Promise<VideoStats[]> {
  if (!videoIds.length) return []

  const json = await yt('/videos', {
    part: 'statistics,snippet',
    id:   videoIds.join(','),
  })

  return (json.items ?? []).map((item: {
    id: string
    snippet: { title: string }
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
  }) => ({
    videoId:      item.id,
    title:        item.snippet.title,
    viewCount:    parseInt(item.statistics.viewCount    ?? '0', 10),
    likeCount:    parseInt(item.statistics.likeCount    ?? '0', 10),
    commentCount: parseInt(item.statistics.commentCount ?? '0', 10),
  }))
}

/** 채널의 최근 업로드 영상 목록 */
export async function getRecentVideos(channelId: string, maxResults = 10) {
  const searchJson = await yt('/search', {
    part:       'snippet',
    channelId,
    type:       'video',
    order:      'date',
    maxResults: String(maxResults),
  })

  const videoIds: string[] = (searchJson.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId)
  if (!videoIds.length) return []

  return getVideoStats(videoIds)
}
