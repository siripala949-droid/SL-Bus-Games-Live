export type StreamStatus = 'LIVE' | 'UPCOMING' | 'PAST';

export type FeedFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'PAST';

export interface CreatorProfile {
  uid?: string;
  email?: string;
  channelName: string;
  channelUrl: string;
  avatarUrl: string;
  subscriberCount: string;
  receivedGems: number;
}

export interface StreamItem {
  id: string;
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  channelUrl: string;
  channelAvatar: string;
  subscriberCount: string;
  status: StreamStatus;
  viewerCount: number;
  peakViewers: number;
  startedAt: string;
  endedAt?: string;
  scheduledFor?: string;
  durationLabel?: string;
  thumbnailUrl: string;
  category: string;
  receivedGems: number;
  creatorId?: string;
  isPublic?: boolean;
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  accentColor: string;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  author: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  isGift?: boolean;
  giftName?: string;
  giftEmoji?: string;
  giftCost?: number;
}

export interface YouTubeSyncVideoResult {
  videoId: string;
  isLive: boolean;
  isUpcoming?: boolean;
  scheduledFor?: string;
  title?: string;
  description?: string;
  channelName?: string;
  channelUrl?: string;
  channelAvatar?: string;
  subscriberText?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  dateText?: string;
}

export const STANDARD_GIFTS: GiftItem[] = [
  { id: 'star', name: 'Star', emoji: '⭐', cost: 10, accentColor: '#f59e0b' },
  { id: 'fire', name: 'Fire', emoji: '🔥', cost: 25, accentColor: '#f97316' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', cost: 50, accentColor: '#eab308' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', cost: 100, accentColor: '#38bdf8' },
];

/**
 * Extracts an 11-character YouTube Video ID from various YouTube URL formats:
 * - https://www.youtube.com/live/VIDEO_ID?si=...
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-character video ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (
        segments.length >= 2 &&
        (segments[0] === 'live' || segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'v')
      ) {
        const candidate = segments[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
          return candidate;
        }
      }
    }
  } catch {
    // Fallback regex
  }

  const regex = /(?:youtube\.com\/(?:watch\?.*v=|live\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

/**
 * Returns the real YouTube high-quality thumbnail URL for a given video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Partitions streams into liveNow, upcoming, and pastLives, and applies feed filter + search query.
 */
export function partitionAndFilterStreams(
  streams: StreamItem[],
  filter: FeedFilter,
  searchQuery = ''
): {
  liveStreams: StreamItem[];
  upcomingStreams: StreamItem[];
  pastStreams: StreamItem[];
} {
  const q = searchQuery.trim().toLowerCase();

  const matchesSearch = (stream: StreamItem) => {
    if (!q) return true;
    return (
      stream.title.toLowerCase().includes(q) ||
      stream.description.toLowerCase().includes(q) ||
      stream.channelName.toLowerCase().includes(q) ||
      stream.category.toLowerCase().includes(q)
    );
  };

  const filtered = streams.filter(matchesSearch);

  const liveStreams =
    filter === 'PAST' || filter === 'UPCOMING'
      ? []
      : filtered
          .filter((s) => s.status === 'LIVE')
          .sort((a, b) => b.viewerCount - a.viewerCount);

  const upcomingStreams =
    filter === 'LIVE' || filter === 'PAST'
      ? []
      : filtered.filter((s) => s.status === 'UPCOMING');

  const pastStreams =
    filter === 'LIVE' || filter === 'UPCOMING'
      ? []
      : filtered.filter((s) => s.status === 'PAST');

  return { liveStreams, upcomingStreams, pastStreams };
}

/**
 * Automatically updates stream status, thumbnail, title, and description from YouTube sync results.
 * When a YouTube live stream ends on YouTube (isLive === false && !isUpcoming), it automatically
 * moves from LIVE NOW to PAST LIVE STREAMS without manual user intervention.
 * When an UPCOMING stream goes live on YouTube (isLive === true), it moves to LIVE NOW.
 */
export function applyYouTubeAutoSync(
  streams: StreamItem[],
  syncResults: Record<string, YouTubeSyncVideoResult>
): {
  streams: StreamItem[];
  autoEndedTitles: string[];
  changed: boolean;
} {
  const autoEndedTitles: string[] = [];
  let changed = false;

  const updated = streams.map((stream) => {
    const sync = syncResults[stream.videoId];
    if (!sync) return stream;

    const nextThumbnail = getYouTubeThumbnailUrl(stream.videoId);
    const nextTitle = sync.title && sync.title.trim().length > 0 ? sync.title : stream.title;
    const nextDesc =
      sync.description && sync.description.trim().length > 0 ? sync.description : stream.description;
    const nextChannelName =
      sync.channelName && sync.channelName.trim().length > 0 ? sync.channelName : stream.channelName;
    const nextChannelUrl =
      sync.channelUrl && sync.channelUrl.trim().length > 0 ? sync.channelUrl : stream.channelUrl;
    const nextChannelAvatar =
      sync.channelAvatar && sync.channelAvatar.trim().length > 0
        ? sync.channelAvatar
        : stream.channelAvatar;
    const nextViewerCount =
      typeof sync.viewCount === 'number' && sync.viewCount > 0 ? sync.viewCount : stream.viewerCount;

    // Determine target status from YouTube's real live/upcoming state
    let nextStatus: StreamStatus = stream.status;
    if (sync.isLive) {
      nextStatus = 'LIVE';
    } else if (sync.isUpcoming) {
      nextStatus = 'UPCOMING';
    } else if (stream.status === 'LIVE') {
      // Stream was LIVE and ended on YouTube -> move to PAST automatically
      nextStatus = 'PAST';
      autoEndedTitles.push(nextTitle);
    }

    const hasMetaChange =
      nextStatus !== stream.status ||
      nextTitle !== stream.title ||
      nextDesc !== stream.description ||
      nextChannelName !== stream.channelName ||
      nextChannelAvatar !== stream.channelAvatar ||
      stream.thumbnailUrl !== nextThumbnail;

    if (!hasMetaChange) {
      return stream;
    }

    changed = true;
    return {
      ...stream,
      status: nextStatus,
      title: nextTitle,
      description: nextDesc,
      channelName: nextChannelName,
      channelUrl: nextChannelUrl,
      channelAvatar: nextChannelAvatar,
      thumbnailUrl: nextThumbnail,
      viewerCount: nextViewerCount,
      peakViewers: Math.max(stream.peakViewers, nextViewerCount),
      scheduledFor: sync.scheduledFor || stream.scheduledFor,
      endedAt: nextStatus === 'PAST' ? stream.endedAt || sync.dateText || 'Ended on YouTube' : undefined,
      durationLabel:
        nextStatus === 'PAST' ? stream.durationLabel || 'Full Broadcast Replay' : undefined,
    };
  });

  return { streams: updated, autoEndedTitles, changed };
}

/**
 * Processes a virtual gift transaction.
 * Pure function: validates balance, deducts cost, increments stream & creator gems, and creates chat message.
 */
export function processGiftTransaction(params: {
  userGems: number;
  gift: GiftItem;
  streamId: string;
  senderName: string;
  streams: StreamItem[];
  creatorProfile: CreatorProfile | null;
}):
  | {
      ok: true;
      newUserGems: number;
      updatedStreams: StreamItem[];
      updatedCreatorProfile: CreatorProfile | null;
      giftMessage: ChatMessage;
    }
  | {
      ok: false;
      error: string;
    } {
  const { userGems, gift, streamId, senderName, streams, creatorProfile } = params;

  if (userGems < gift.cost) {
    return {
      ok: false,
      error: `Insufficient balance. You need ${gift.cost} Gems to send ${gift.name}.`,
    };
  }

  const targetStream = streams.find((s) => s.id === streamId);
  if (!targetStream) {
    return {
      ok: false,
      error: 'Stream not found.',
    };
  }

  const newUserGems = userGems - gift.cost;

  const updatedStreams = streams.map((s) =>
    s.id === streamId ? { ...s, receivedGems: s.receivedGems + gift.cost } : s
  );

  let updatedCreatorProfile = creatorProfile;
  if (
    creatorProfile &&
    creatorProfile.channelName.toLowerCase() === targetStream.channelName.toLowerCase()
  ) {
    updatedCreatorProfile = {
      ...creatorProfile,
      receivedGems: creatorProfile.receivedGems + gift.cost,
    };
  }

  const giftMessage: ChatMessage = {
    id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    streamId,
    author: senderName || 'Viewer_LK',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    text: `Sent a ${gift.name} ${gift.emoji} (${gift.cost} Gems)!`,
    timestamp: 'Just now',
    isGift: true,
    giftName: gift.name,
    giftEmoji: gift.emoji,
    giftCost: gift.cost,
  };

  return {
    ok: true,
    newUserGems,
    updatedStreams,
    updatedCreatorProfile,
    giftMessage,
  };
}

/**
 * Real Past Live Streams from Automaker (@AutomakerLk).
 * No fake LIVE NOW streams are pre-populated — only genuinely live or creator-added broadcasts appear in LIVE NOW.
 */
export const INITIAL_STREAMS: StreamItem[] = [
  {
    id: 'stream-past-1',
    videoId: 'i01DnisYrZg',
    title: 'බස් ගේම් එකේ මිතුදම් චාරිකාව 01 | Automaker is Live!',
    description:
      'ලංකාවේ බස් ගේම් එක | FTB (Future Tech Bus) 🇱🇰 බස් ගේම් එකේ මිතුදම් චාරිකාව 01 සජීවී විකාශනය (Full Live Replay).',
    channelName: 'Automaker',
    channelUrl: 'https://www.youtube.com/@AutomakerLk',
    channelAvatar:
      'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
    subscriberCount: '10.8K',
    status: 'PAST',
    viewerCount: 917,
    peakViewers: 917,
    startedAt: 'Streamed live on Aug 17, 2025',
    endedAt: 'Streamed live on Aug 17, 2025',
    durationLabel: 'Full Broadcast Replay',
    thumbnailUrl: getYouTubeThumbnailUrl('i01DnisYrZg'),
    category: 'FTB Sri Lanka • Convoy',
    receivedGems: 340,
    isPublic: true,
  },
  {
    id: 'stream-past-2',
    videoId: '5Lz3AtDooy8',
    title: 'තාල රටා Holy Festival 2025 | Automaker is live!',
    description:
      'තාල රටා Holy Festival 2025 විශේෂ බස් ගේම් සජීවී විකාශනය — Dam Rajini, Duminda & Automaker Sri Lanka Bus Gaming.',
    channelName: 'Automaker',
    channelUrl: 'https://www.youtube.com/@AutomakerLk',
    channelAvatar:
      'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
    subscriberCount: '10.8K',
    status: 'PAST',
    viewerCount: 1581,
    peakViewers: 1581,
    startedAt: 'Streamed live on Oct 11, 2025',
    endedAt: 'Streamed live on Oct 11, 2025',
    durationLabel: 'Full Broadcast Replay',
    thumbnailUrl: getYouTubeThumbnailUrl('5Lz3AtDooy8'),
    category: 'Holy Festival • Bus Mod LK',
    receivedGems: 520,
    isPublic: true,
  },
  {
    id: 'stream-past-3',
    videoId: 'wz5n2ugAzP4',
    title: '🔴 Grand Bus Holi Dance Festival 2026 | Evening LIVE | FTB Meetup 2026 | Alawwa 🇱🇰',
    description:
      'Welcome to the Grand Bus Holi Dance Festival 2026 – Evening LIVE! Experience the ultimate celebration of colors, music, and modified Sri Lankan buses at the FTB Meetup 2026 in Alawwa.',
    channelName: 'Automaker',
    channelUrl: 'https://www.youtube.com/@AutomakerLk',
    channelAvatar:
      'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
    subscriberCount: '10.8K',
    status: 'PAST',
    viewerCount: 1207,
    peakViewers: 1207,
    startedAt: 'Streamed live on Mar 21, 2026',
    endedAt: 'Streamed live on Mar 21, 2026',
    durationLabel: 'Full Broadcast Replay',
    thumbnailUrl: getYouTubeThumbnailUrl('wz5n2ugAzP4'),
    category: 'FTB Meetup 2026 • Alawwa',
    receivedGems: 460,
    isPublic: true,
  },
  {
    id: 'stream-past-4',
    videoId: 'onshPEQfaD8',
    title: 'Grand Bus Holi Dance Festival 2026 | Colors, Music & Non-Stop Celebration',
    description:
      'Get ready to experience the ultimate explosion of colors, music, and unstoppable energy at the Grand Bus Holi Dance Festival 2026 with Sri Lanka Bus Gaming!',
    channelName: 'Automaker',
    channelUrl: 'https://www.youtube.com/@AutomakerLk',
    channelAvatar:
      'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
    subscriberCount: '10.8K',
    status: 'PAST',
    viewerCount: 1495,
    peakViewers: 1495,
    startedAt: 'Streamed live on Mar 21, 2026',
    endedAt: 'Streamed live on Mar 21, 2026',
    durationLabel: 'Full Broadcast Replay',
    thumbnailUrl: getYouTubeThumbnailUrl('onshPEQfaD8'),
    category: 'Holi Dance Festival • FTB LK',
    receivedGems: 390,
    isPublic: true,
  },
];

export const INITIAL_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'stream-past-1': [
    {
      id: 'm1',
      streamId: 'stream-past-1',
      author: 'Kasun_LK',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      text: 'මිතුදම් චාරිකාව 01 සුපිරිම ලයිව් එකක්! 🔥🇱🇰',
      timestamp: 'Replay Chat',
    },
    {
      id: 'm2',
      streamId: 'stream-past-1',
      author: 'NimeshGaming',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      text: 'Sent a Trophy 🏆 (50 Gems)!',
      timestamp: 'Replay Chat',
      isGift: true,
      giftName: 'Trophy',
      giftEmoji: '🏆',
      giftCost: 50,
    },
  ],
  'stream-past-2': [
    {
      id: 'm3',
      streamId: 'stream-past-2',
      author: 'DilanSL',
      authorAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
      text: 'තාල රටා Holy Festival 2025 බස් සෙට් එක පට්ට! 🔥',
      timestamp: 'Replay Chat',
    },
  ],
  'stream-past-3': [
    {
      id: 'm4',
      streamId: 'stream-past-3',
      author: 'Chathura_Bussid',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      text: 'Alawwa FTB Meetup 2026 Evening Live සුපිරි! 🇱🇰',
      timestamp: 'Replay Chat',
    },
  ],
};
