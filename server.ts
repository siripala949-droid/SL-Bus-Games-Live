import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface YouTubeMetadataResponse {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  channelUrl: string;
  channelAvatar: string;
  subscriberText: string;
  thumbnailUrl: string;
  isLive: boolean;
  isUpcoming: boolean;
  scheduledFor: string;
  viewCount: number;
  dateText: string;
}

export interface YouTubeChannelVideoItem {
  videoId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  thumbnailUrl: string;
  status: 'LIVE' | 'UPCOMING' | 'PAST';
}

export interface YouTubeChannelInfoResponse {
  channelId: string;
  channelName: string;
  channelUrl: string;
  avatarUrl: string;
  subscriberText: string;
  videos: YouTubeChannelVideoItem[];
}

const metadataCache = new Map<
  string,
  { data: YouTubeMetadataResponse; expiresAt: number }
>();

const CACHE_TTL_MS = 25 * 1000;

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchYouTubeVideoMetadata(
  videoId: string
): Promise<YouTubeMetadataResponse> {
  const now = Date.now();
  const cached = metadataCache.get(videoId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  let title = '';
  let description = '';
  let channelName = '';
  let channelUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let channelAvatar = '';
  let subscriberText = '';
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let isLive = false;
  let isUpcoming = false;
  let scheduledFor = '';
  let viewCount = 0;
  let dateText = '';

  // 1. Fetch reliable oEmbed metadata for title, author_name, author_url
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
      videoId
    )}&format=json`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });
    if (oembedRes.ok) {
      const oembed = (await oembedRes.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
      };
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) channelName = oembed.author_name;
      if (oembed.author_url) channelUrl = oembed.author_url;
    }
  } catch {
    // Continue to InnerTube next call
  }

  // 2. Fetch full description, live/upcoming broadcast state, view count, and channel avatar from InnerTube /youtubei/v1/next
  try {
    const nextRes = await fetch(
      'https://www.youtube.com/youtubei/v1/next?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240726.00.00',
              hl: 'en',
              gl: 'LK',
            },
          },
          videoId,
        }),
      }
    );

    const rawText = await nextRes.text();
    if (rawText.trim().startsWith('{')) {
      const data = JSON.parse(rawText);
      const contents =
        data?.contents?.twoColumnWatchNextResults?.results?.results?.contents ||
        [];
      const primary = contents.find(
        (c: Record<string, unknown>) => c.videoPrimaryInfoRenderer
      )?.videoPrimaryInfoRenderer;
      const secondary = contents.find(
        (c: Record<string, unknown>) => c.videoSecondaryInfoRenderer
      )?.videoSecondaryInfoRenderer;

      const primaryTitle =
        primary?.title?.runs
          ?.map((r: { text?: string }) => r.text || '')
          .join('') || '';
      if (primaryTitle) title = primaryTitle;

      const vcRenderer = primary?.viewCount?.videoViewCountRenderer;
      isLive = Boolean(vcRenderer?.isLive);

      const vcString =
        vcRenderer?.viewCount?.simpleText ||
        vcRenderer?.viewCount?.runs
          ?.map((r: { text?: string }) => r.text || '')
          .join('') ||
        '';
      const digits = vcString.replace(/[^0-9]/g, '');
      if (digits) {
        viewCount = Number(digits);
      }

      if (primary?.dateText?.simpleText) {
        dateText = primary.dateText.simpleText;
      }

      // Check if upcoming scheduled live broadcast
      const lowerDate = dateText.toLowerCase();
      const lowerVc = vcString.toLowerCase();
      if (
        lowerDate.includes('scheduled for') ||
        lowerDate.includes('premieres') ||
        lowerVc.includes('waiting')
      ) {
        isUpcoming = true;
        isLive = false;
        scheduledFor = dateText || vcString;
      }

      const fullDesc =
        secondary?.attributedDescription?.content ||
        secondary?.description?.runs
          ?.map((r: { text?: string }) => r.text || '')
          .join('') ||
        '';
      if (fullDesc) {
        description = fullDesc;
      }

      const owner = secondary?.owner?.videoOwnerRenderer;
      const ownerName = owner?.title?.runs?.[0]?.text;
      if (ownerName) channelName = ownerName;

      const ownerThumbs = owner?.thumbnail?.thumbnails;
      if (Array.isArray(ownerThumbs) && ownerThumbs.length > 0) {
        channelAvatar = ownerThumbs[ownerThumbs.length - 1]?.url || '';
      }

      if (owner?.subscriberCountText?.simpleText) {
        subscriberText = owner.subscriberCountText.simpleText;
      }
    }
  } catch {
    // Ignore InnerTube errors and use oEmbed fallback
  }

  const result: YouTubeMetadataResponse = {
    videoId,
    title: title || `YouTube Broadcast (${videoId})`,
    description:
      description ||
      (title
        ? `${title} — Official YouTube broadcast by ${channelName || 'Creator'}.`
        : 'Official Sri Lanka Bus Gaming YouTube broadcast.'),
    channelName: channelName || 'YouTube Creator',
    channelUrl,
    channelAvatar,
    subscriberText: subscriberText || 'YouTube Channel',
    thumbnailUrl,
    isLive,
    isUpcoming,
    scheduledFor,
    viewCount,
    dateText:
      dateText ||
      (isUpcoming
        ? 'Upcoming Live Broadcast'
        : isLive
        ? 'Streaming live now'
        : 'Past live stream'),
  };

  metadataCache.set(videoId, {
    data: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return result;
}

async function fetchYouTubeChannelInfo(
  rawInput: string
): Promise<YouTubeChannelInfoResponse> {
  let targetUrl = rawInput.trim();
  if (targetUrl.startsWith('@')) {
    targetUrl = `https://www.youtube.com/${targetUrl}`;
  } else if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://www.youtube.com/@${targetUrl.replace(/^\/+/, '')}`;
  }

  // Ensure we hit the channel page
  const cleanChannelUrl = targetUrl.replace(/\/(streams|videos|featured|shorts)\/?$/i, '');
  const streamsTabUrl = `${cleanChannelUrl}/streams`;

  const res = await fetch(streamsTabUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.+?\});<\/script>/s);

  let channelId = '';
  let channelName = '';
  let canonicalUrl = cleanChannelUrl;
  let avatarUrl = '';
  let subscriberText = '';
  const discoveredVideos: YouTubeChannelVideoItem[] = [];
  const seenIds = new Set<string>();

  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const meta = data?.metadata?.channelMetadataRenderer;
      if (meta) {
        channelId = meta.externalId || '';
        channelName = meta.title || '';
        canonicalUrl = meta.vanityChannelUrl || cleanChannelUrl;
        avatarUrl = meta.avatar?.thumbnails?.[0]?.url || '';
      }

      const headerSub =
        data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata
          ?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[0]
          ?.text?.content || '';
      if (headerSub) {
        subscriberText = headerSub;
      }

      // Walk ytInitialData for any videoRenderer (from /streams tab)
      const walk = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const obj = node as Record<string, any>;
        if (obj.videoRenderer && typeof obj.videoRenderer.videoId === 'string') {
          const v = obj.videoRenderer;
          const vid: string = v.videoId;
          if (!seenIds.has(vid) && vid.length === 11) {
            seenIds.add(vid);
            const vTitle =
              v.title?.runs?.map((r: { text?: string }) => r.text || '').join('') ||
              v.title?.simpleText ||
              '';
            const vDesc =
              v.descriptionSnippet?.runs
                ?.map((r: { text?: string }) => r.text || '')
                .join('') || '';
            const published = v.publishedTimeText?.simpleText || '';
            const viewText =
              v.viewCountText?.simpleText ||
              v.viewCountText?.runs
                ?.map((r: { text?: string }) => r.text || '')
                .join('') ||
              '';
            const digits = viewText.replace(/[^0-9]/g, '');
            const isUp = Boolean(v.upcomingEventData);
            const isLv =
              Boolean(
                v.badges?.some(
                  (b: any) =>
                    b?.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW'
                )
              ) || viewText.toLowerCase().includes('watching');

            discoveredVideos.push({
              videoId: vid,
              youtubeUrl: `https://www.youtube.com/live/${vid}`,
              title: vTitle || `Broadcast (${vid})`,
              description: vDesc || vTitle,
              publishedAt:
                published ||
                (isUp ? 'Upcoming Live' : isLv ? 'Live Now' : 'Past Stream'),
              viewCount: digits ? Number(digits) : 0,
              thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              status: isUp ? 'UPCOMING' : isLv ? 'LIVE' : 'PAST',
            });
          }
        }
        for (const key of Object.keys(obj)) {
          walk(obj[key]);
        }
      };
      walk(data.contents);
    } catch {
      // Fallback to RSS feed below
    }
  }

  // Also fetch official YouTube RSS feed for the channel if channelId is available
  if (channelId) {
    try {
      const rssRes = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
          channelId
        )}`
      );
      if (rssRes.ok) {
        const rss = await rssRes.text();
        const entries = [...rss.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(
          0,
          10
        );
        for (const m of entries) {
          const entryXml = m[1];
          const vid = (entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ||
            [])[1];
          if (!vid || seenIds.has(vid)) continue;
          seenIds.add(vid);

          const rawTitle =
            (entryXml.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
          const rawDesc =
            (entryXml.match(
              /<media:description>([\s\S]*?)<\/media:description>/
            ) || [])[1] || '';
          const publishedIso =
            (entryXml.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
          const viewsStr = (entryXml.match(/views="(\d+)"/) || [])[1] || '0';
          const viewsNum = Number(viewsStr) || 0;

          discoveredVideos.push({
            videoId: vid,
            youtubeUrl: `https://www.youtube.com/watch?v=${vid}`,
            title: decodeXmlEntities(rawTitle),
            description: decodeXmlEntities(rawDesc).slice(0, 600),
            publishedAt: publishedIso ? publishedIso.slice(0, 10) : 'Recent',
            viewCount: viewsNum,
            thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            status: viewsNum === 0 ? 'UPCOMING' : 'PAST',
          });
        }
      }
    } catch {
      // Ignore RSS errors
    }
  }

  return {
    channelId,
    channelName: channelName || 'Connected YouTube Channel',
    channelUrl: canonicalUrl.replace(/^http:\/\//i, 'https://'),
    avatarUrl,
    subscriberText: subscriberText || 'YouTube Gaming Channel',
    videos: discoveredVideos.slice(0, 12),
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/youtube/video-info', async (req, res) => {
    const videoId = String(req.query.videoId || '').trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      res.status(400).json({ error: 'Invalid YouTube Video ID' });
      return;
    }

    try {
      const info = await fetchYouTubeVideoMetadata(videoId);
      res.json(info);
    } catch {
      res.status(500).json({ error: 'Failed to fetch YouTube metadata' });
    }
  });

  app.get('/api/youtube/channel-info', async (req, res) => {
    const channelUrl = String(req.query.channelUrl || '').trim();
    if (!channelUrl) {
      res.status(400).json({ error: 'Channel URL or @handle is required' });
      return;
    }

    try {
      const info = await fetchYouTubeChannelInfo(channelUrl);
      res.json(info);
    } catch {
      res.status(500).json({ error: 'Failed to fetch YouTube channel info' });
    }
  });

  app.post('/api/youtube/sync-streams', async (req, res) => {
    const rawIds = Array.isArray(req.body?.videoIds) ? req.body.videoIds : [];
    const validIds = rawIds
      .map((id: unknown) => String(id || '').trim())
      .filter((id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id))
      .slice(0, 12);

    const results: Record<string, YouTubeMetadataResponse> = {};
    for (const id of validIds) {
      try {
        results[id] = await fetchYouTubeVideoMetadata(id);
      } catch {
        // Skip failed individual lookup
      }
    }

    res.json({ streams: results });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
