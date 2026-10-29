import React, { useState } from 'react';
import {
  Youtube,
  Gem,
  Radio,
  Clock,
  ExternalLink,
  CheckCircle2,
  PlusCircle,
  Play,
  RefreshCw,
  LogIn,
  LogOut,
  Calendar,
  Globe,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  CreatorProfile,
  StreamItem,
  StreamStatus,
  getYouTubeThumbnailUrl,
} from '../utils/streamLogic';

interface DiscoveredChannelVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  status: StreamStatus;
  viewCount: number;
  scheduledFor?: string;
  publishedAt?: string;
}

interface CreatorChannelViewProps {
  isAuthenticated: boolean;
  authUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  creatorProfile: CreatorProfile | null;
  streams: StreamItem[];
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onSaveProfile: (profile: CreatorProfile) => void;
  onQuickPublishChannelVideo: (video: {
    videoId: string;
    title: string;
    description: string;
    status: StreamStatus;
    scheduledFor?: string;
    channelName: string;
    channelUrl: string;
    channelAvatar: string;
    subscriberCount: string;
  }) => void;
  onUpdateStreamStatus: (streamId: string, newStatus: StreamStatus) => void;
  onDeleteStream: (streamId: string) => void;
  onSelectStream: (stream: StreamItem) => void;
  onNavigateToCast: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const CreatorChannelView: React.FC<CreatorChannelViewProps> = ({
  isAuthenticated,
  authUser,
  creatorProfile,
  streams,
  onGoogleSignIn,
  onSignOut,
  onSaveProfile,
  onQuickPublishChannelVideo,
  onUpdateStreamStatus,
  onDeleteStream,
  onSelectStream,
  onNavigateToCast,
  onSyncNow,
  isSyncing,
}) => {
  const [channelName, setChannelName] = useState(creatorProfile?.channelName || '');
  const [channelUrl, setChannelUrl] = useState(
    creatorProfile?.channelUrl || 'https://www.youtube.com/@AutomakerLk'
  );
  const [avatarUrl, setAvatarUrl] = useState(creatorProfile?.avatarUrl || '');
  const [subscriberCount, setSubscriberCount] = useState(
    creatorProfile?.subscriberCount || ''
  );
  const [savedNotice, setSavedNotice] = useState(false);

  // Channel video discovery state
  const [loadingChannelVideos, setLoadingChannelVideos] = useState(false);
  const [channelFetchError, setChannelFetchError] = useState<string | null>(null);
  const [discoveredVideos, setDiscoveredVideos] = useState<DiscoveredChannelVideo[]>([]);

  const handleFetchChannelFromYouTube = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl ?? channelUrl).trim();
    if (!urlToFetch) return;

    setLoadingChannelVideos(true);
    setChannelFetchError(null);

    try {
      const res = await fetch(
        `/api/youtube/channel-info?channelUrl=${encodeURIComponent(urlToFetch)}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not load YouTube channel info');
      }
      const data = await res.json();

      const nextName = data.channelName || channelName || authUser?.displayName || 'YouTube Creator';
      const nextUrl = data.channelUrl || urlToFetch;
      const nextAvatar =
        data.channelAvatar ||
        avatarUrl ||
        authUser?.photoURL ||
        'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj';
      const nextSubs = (data.subscriberText || subscriberCount || '10.8K').replace(
        /\s*subscribers/i,
        ''
      );

      setChannelName(nextName);
      setChannelUrl(nextUrl);
      setAvatarUrl(nextAvatar);
      setSubscriberCount(nextSubs);

      if (Array.isArray(data.videos)) {
        setDiscoveredVideos(data.videos);
      }

      onSaveProfile({
        uid: authUser?.uid,
        email: authUser?.email || undefined,
        channelName: nextName,
        channelUrl: nextUrl,
        avatarUrl: nextAvatar,
        subscriberCount: nextSubs,
        receivedGems: creatorProfile?.receivedGems || 0,
      });

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err) {
      setChannelFetchError(
        err instanceof Error ? err.message : 'Failed to fetch YouTube channel videos'
      );
    } finally {
      setLoadingChannelVideos(false);
    }
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !channelUrl.trim()) return;

    onSaveProfile({
      uid: authUser?.uid,
      email: authUser?.email || undefined,
      channelName: channelName.trim(),
      channelUrl: channelUrl.trim(),
      avatarUrl:
        avatarUrl.trim() ||
        authUser?.photoURL ||
        'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
      subscriberCount: subscriberCount.trim() || '1K',
      receivedGems: creatorProfile?.receivedGems || 0,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Not signed in -> show clean Firebase Google Sign-In screen (NO fake profile!)
  if (!isAuthenticated || !authUser) {
    return (
      <div className="p-4 max-w-xl mx-auto space-y-5 pb-24">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#e11d48]/20 via-[#131318] to-[#131318] border border-[#e11d48]/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#e11d48] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#e11d48]/30">
            <Youtube className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              Creator Channel Studio
            </h1>
            <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
              Sign in with the Google Account linked to your YouTube Channel to connect your channel, add Upcoming Live links, and publish your Upcoming, Live Now, or Past Live broadcasts to the public feed.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs shadow-xl transition active:scale-95"
          >
            <LogIn className="w-4 h-4 text-[#e11d48]" />
            <span>Sign in with Google Account</span>
          </button>

          <p className="text-[11px] text-zinc-500">
            Powered by Firebase Authentication & Cloud Firestore • Real-time Public Feed Sync
          </p>
        </div>
      </div>
    );
  }

  const effectiveChannelName =
    creatorProfile?.channelName || channelName || authUser.displayName || 'Creator Channel';
  const effectiveChannelUrl =
    creatorProfile?.channelUrl || channelUrl || 'https://www.youtube.com/@AutomakerLk';
  const effectiveAvatar =
    creatorProfile?.avatarUrl ||
    avatarUrl ||
    authUser.photoURL ||
    'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj';
  const effectiveSubs = creatorProfile?.subscriberCount || subscriberCount || '10.8K';

  const creatorStreams = streams.filter(
    (s) =>
      s.creatorId === authUser.uid ||
      s.channelName.toLowerCase() === effectiveChannelName.toLowerCase()
  );

  const publishedVideoIds = new Set(streams.map((s) => s.videoId));

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5 pb-24">
      {/* Authenticated Google Account Header */}
      <div className="p-4 rounded-2xl bg-[#131318] border border-white/[0.08] flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={effectiveAvatar}
              alt={effectiveChannelName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#e11d48] shrink-0 bg-zinc-800"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-white truncate">
                  {effectiveChannelName}
                </h1>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <p className="text-[11px] text-zinc-400 truncate">{authUser.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-semibold border border-white/10 transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-[#0b0b0e] border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Creator Gems
              </p>
              <p className="text-base font-mono font-extrabold text-amber-400 mt-0.5">
                {creatorProfile?.receivedGems ?? 0}
              </p>
            </div>
            <Gem className="w-5 h-5 text-amber-400" />
          </div>

          <div className="p-3 rounded-xl bg-[#0b0b0e] border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Public Streams
              </p>
              <p className="text-base font-mono font-extrabold text-white mt-0.5">
                {creatorStreams.length}
              </p>
            </div>
            <Youtube className="w-5 h-5 text-[#e11d48]" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNavigateToCast}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#e11d48]/25 transition"
          >
            <PlusCircle className="w-4 h-4" />
            + Add Upcoming / Live Link
          </button>
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#e11d48]' : ''}`} />
            Sync Status
          </button>
        </div>
      </div>

      {/* Step 1: Connect / Sync YouTube Channel & Discover Channel Streams */}
      <form
        onSubmit={handleSaveManual}
        className="p-4 rounded-2xl bg-[#131318] border border-white/[0.08] space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-[#e11d48]" />
              Connect Your YouTube Channel
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Enter your YouTube channel link or @handle to load your Upcoming, Live, and Past streams
            </p>
          </div>
          {savedNotice && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced!
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              YouTube Channel URL or @Handle
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@AutomakerLk"
                className="flex-1 bg-[#0b0b0e] text-xs text-white px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
              />
              <button
                type="button"
                onClick={() => handleFetchChannelFromYouTube()}
                disabled={loadingChannelVideos}
                className="px-3.5 py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-md shadow-[#e11d48]/25 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingChannelVideos ? 'animate-spin' : ''}`} />
                {loadingChannelVideos ? 'Loading...' : 'Load Channel'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Channel Name
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g., Automaker"
                className="w-full bg-[#0b0b0e] text-xs text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Subscribers
              </label>
              <input
                type="text"
                value={subscriberCount}
                onChange={(e) => setSubscriberCount(e.target.value)}
                placeholder="e.g., 10.8K"
                className="w-full bg-[#0b0b0e] text-xs text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
              />
            </div>
          </div>
        </div>

        {channelFetchError && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
            {channelFetchError}
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/10 transition"
        >
          Save Channel Profile to Firebase
        </button>
      </form>

      {/* Step 2: 1-Click Publish Discovered Videos from Connected YouTube Channel */}
      {discoveredVideos.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#131318] border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Channel Streams Found ({discoveredVideos.length}) — Publish to Public Feed
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Select any stream from your YouTube channel below to publish it as Upcoming Live, Live Now, or Past Live on the public app feed.
          </p>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {discoveredVideos.map((vid) => {
              const alreadyPublished = publishedVideoIds.has(vid.videoId);
              return (
                <div
                  key={vid.videoId}
                  className="p-3 rounded-xl bg-[#0b0b0e] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getYouTubeThumbnailUrl(vid.videoId)}
                      alt={vid.title}
                      className="w-24 h-14 rounded-lg object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mb-1 ${
                          vid.status === 'LIVE'
                            ? 'bg-[#e11d48] text-white'
                            : vid.status === 'UPCOMING'
                              ? 'bg-amber-500 text-black'
                              : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {vid.status === 'LIVE'
                          ? 'LIVE ON YOUTUBE'
                          : vid.status === 'UPCOMING'
                            ? `UPCOMING ${vid.scheduledFor ? `• ${vid.scheduledFor}` : ''}`
                            : 'PAST STREAM'}
                      </span>
                      <p className="text-xs font-bold text-white line-clamp-1">{vid.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {vid.viewCount > 0 ? `${vid.viewCount.toLocaleString()} views` : vid.videoId}
                      </p>
                    </div>
                  </div>

                  {alreadyPublished ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                      Public in Feed
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          onQuickPublishChannelVideo({
                            videoId: vid.videoId,
                            title: vid.title,
                            description: vid.description,
                            status: vid.status,
                            scheduledFor: vid.scheduledFor,
                            channelName: effectiveChannelName,
                            channelUrl: effectiveChannelUrl,
                            channelAvatar: effectiveAvatar,
                            subscriberCount: effectiveSubs,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold transition shadow-sm"
                      >
                        Make Public ({vid.status})
                      </button>
                      {vid.status !== 'UPCOMING' && (
                        <button
                          type="button"
                          onClick={() =>
                            onQuickPublishChannelVideo({
                              videoId: vid.videoId,
                              title: vid.title,
                              description: vid.description,
                              status: 'UPCOMING',
                              scheduledFor: 'Upcoming Live',
                              channelName: effectiveChannelName,
                              channelUrl: effectiveChannelUrl,
                              channelAvatar: effectiveAvatar,
                              subscriberCount: effectiveSubs,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
                        >
                          + Upcoming
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Manage Creator's Published Public Streams */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-[#e11d48]" />
          Your Public Streams on Platform ({creatorStreams.length})
        </h3>

        {creatorStreams.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#131318] border border-white/[0.06] text-xs text-zinc-400 text-center">
            No streams published under {effectiveChannelName} yet. Click &quot;Load Channel&quot; above or &quot;+ Add Upcoming / Live Link&quot; to publish your streams.
          </div>
        ) : (
          <div className="space-y-2.5">
            {creatorStreams.map((stream) => (
              <div
                key={stream.id}
                className="p-3 rounded-xl bg-[#131318] border border-white/[0.08] flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    onClick={() => onSelectStream(stream)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={getYouTubeThumbnailUrl(stream.videoId)}
                      alt={stream.title}
                      className="w-24 h-14 rounded-lg object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mb-1 ${
                          stream.status === 'LIVE'
                            ? 'bg-[#e11d48] text-white'
                            : stream.status === 'UPCOMING'
                              ? 'bg-amber-500 text-black'
                              : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {stream.status === 'LIVE' ? (
                          <>
                            <Radio className="w-2.5 h-2.5" /> LIVE NOW
                          </>
                        ) : stream.status === 'UPCOMING' ? (
                          <>
                            <Calendar className="w-2.5 h-2.5" /> UPCOMING LIVE
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5" /> PAST LIVE
                          </>
                        )}
                      </span>
                      <p className="text-xs font-bold text-white truncate">{stream.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {stream.viewerCount.toLocaleString()} views • {stream.receivedGems} Gems
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectStream(stream)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    Watch
                  </button>
                </div>

                {/* Creator Status Controls */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold mr-1">
                      Set Status:
                    </span>
                    {(['UPCOMING', 'LIVE', 'PAST'] as StreamStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateStreamStatus(stream.id, st)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                          stream.status === st
                            ? st === 'LIVE'
                              ? 'bg-[#e11d48] text-white'
                              : st === 'UPCOMING'
                                ? 'bg-amber-500 text-black'
                                : 'bg-zinc-200 text-black'
                            : 'bg-white/[0.05] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {stream.creatorId === authUser.uid && (
                    <button
                      type="button"
                      onClick={() => onDeleteStream(stream.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
