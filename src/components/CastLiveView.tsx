import React, { useState, useEffect } from 'react';
import {
  Radio,
  Youtube,
  Link2,
  CheckCircle2,
  AlertCircle,
  Tag,
  RefreshCw,
  FileText,
  Calendar,
  LogIn,
  Clock,
} from 'lucide-react';
import {
  CreatorProfile,
  StreamStatus,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '../utils/streamLogic';

interface CastLiveViewProps {
  isAuthenticated: boolean;
  userEmail?: string | null;
  creatorProfile: CreatorProfile | null;
  onGoogleSignIn: () => void;
  onPublishStream: (params: {
    videoId: string;
    title: string;
    description: string;
    category: string;
    thumbnailUrl: string;
    status: StreamStatus;
    scheduledFor?: string;
    detectedChannelName?: string;
    detectedChannelUrl?: string;
    detectedChannelAvatar?: string;
  }) => void;
  onNavigateToChannel: () => void;
}

const CATEGORIES = [
  'FTB Sri Lanka • Convoy',
  'Bussid Sri Lanka • Live Route',
  'Holy Festival • Bus Mod LK',
  'FTB Meetup 2026 • Alawwa',
  'Multiplayer Convoy • Express',
];

export const CastLiveView: React.FC<CastLiveViewProps> = ({
  isAuthenticated,
  userEmail,
  creatorProfile,
  onGoogleSignIn,
  onPublishStream,
  onNavigateToChannel,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedStatus, setSelectedStatus] = useState<StreamStatus>('LIVE');
  const [scheduledFor, setScheduledFor] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [detectedChannel, setDetectedChannel] = useState<{
    name?: string;
    url?: string;
    avatar?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);

  const extractedVideoId = extractYouTubeVideoId(youtubeUrl);

  useEffect(() => {
    if (!extractedVideoId) return;

    let cancelled = false;
    setFetchingMeta(true);

    fetch(`/api/youtube/video-info?videoId=${encodeURIComponent(extractedVideoId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.isUpcoming) {
          setSelectedStatus('UPCOMING');
          if (data.scheduledFor) setScheduledFor(data.scheduledFor);
        } else if (data.isLive) {
          setSelectedStatus('LIVE');
        } else {
          setSelectedStatus('PAST');
        }
        setDetectedChannel({
          name: data.channelName || undefined,
          url: data.channelUrl || undefined,
          avatar: data.channelAvatar || undefined,
        });
      })
      .catch(() => {
        // Fallback if offline
      })
      .finally(() => {
        if (!cancelled) setFetchingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [extractedVideoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      setError('Please sign in with your Google Account first to publish a stream.');
      return;
    }

    if (!extractedVideoId) {
      setError(
        'Please enter a valid YouTube URL (e.g., https://www.youtube.com/live/VIDEO_ID or https://youtu.be/VIDEO_ID)'
      );
      return;
    }

    if (!title.trim()) {
      setError('Please enter a stream title.');
      return;
    }

    onPublishStream({
      videoId: extractedVideoId,
      title: title.trim(),
      description: description.trim(),
      category,
      thumbnailUrl: getYouTubeThumbnailUrl(extractedVideoId),
      status: selectedStatus,
      scheduledFor: selectedStatus === 'UPCOMING' ? scheduledFor.trim() || 'Upcoming Broadcast' : undefined,
      detectedChannelName: detectedChannel.name,
      detectedChannelUrl: detectedChannel.url,
      detectedChannelAvatar: detectedChannel.avatar,
    });
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5 pb-24">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#e11d48]/20 via-[#131318] to-[#131318] border border-[#e11d48]/30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#e11d48] text-white flex items-center justify-center shadow-lg shadow-[#e11d48]/30">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">
              Publish Live / Upcoming YouTube Stream
            </h1>
            <p className="text-xs text-zinc-400">
              Add your Upcoming Live, Active Live, or Past Broadcast link to the public feed
            </p>
          </div>
        </div>
      </div>

      {/* Authentication Gate */}
      {!isAuthenticated ? (
        <div className="p-5 rounded-2xl bg-[#131318] border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#e11d48]/15 border border-[#e11d48]/30 text-[#fb7185] flex items-center justify-center mx-auto">
            <Youtube className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-white">
            Creator Google Account Required
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Sign in with the Google Account connected to your YouTube channel to publish Upcoming Live links, Active Live broadcasts, or Past Live replays.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold shadow-lg shadow-[#e11d48]/25 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google Account
            </button>
            <button
              type="button"
              onClick={onNavigateToChannel}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-semibold border border-white/10 transition"
            >
              Open Channel Studio
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Connected Creator Status */}
          <div className="p-3.5 rounded-xl bg-[#131318] border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {creatorProfile?.avatarUrl ? (
                <img
                  src={creatorProfile.avatarUrl}
                  alt={creatorProfile.channelName}
                  className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#e11d48]/20 border border-[#e11d48]/40 text-[#fb7185] flex items-center justify-center font-bold text-sm shrink-0">
                  {(creatorProfile?.channelName || userEmail || 'C')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {creatorProfile?.channelName || userEmail}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {creatorProfile?.channelUrl || 'Signed in with Google • Ready to publish'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToChannel}
              className="text-xs font-semibold text-[#fb7185] hover:underline shrink-0"
            >
              Channel Studio
            </button>
          </div>

          {/* Cast Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* YouTube Live URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                YouTube Live / Upcoming / Past URL *
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/live/VIDEO_ID"
                  className="w-full bg-[#131318] text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Paste your YouTube Live, Upcoming Scheduled Live, or Past Live link. Thumbnail, title & description load automatically.
              </p>
            </div>

            {/* Stream Broadcast Type Selector (LIVE / UPCOMING / PAST) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Broadcast Status *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('LIVE')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                    selectedStatus === 'LIVE'
                      ? 'bg-[#e11d48] text-white border-[#e11d48] shadow-md shadow-[#e11d48]/25'
                      : 'bg-[#131318] text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live Now 🔴
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('UPCOMING')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                    selectedStatus === 'UPCOMING'
                      ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/25'
                      : 'bg-[#131318] text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Upcoming 🗓️
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('PAST')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                    selectedStatus === 'PAST'
                      ? 'bg-zinc-200 text-black border-zinc-200'
                      : 'bg-[#131318] text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Past Live 📼
                </button>
              </div>
            </div>

            {/* Optional Scheduled Date/Time for Upcoming Live */}
            {selectedStatus === 'UPCOMING' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Scheduled Date / Time (Upcoming Live)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    placeholder="e.g., Tonight at 8:30 PM IST • Convoy Meetup"
                    className="w-full bg-[#131318] text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-amber-500/30 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Real YouTube Thumbnail & Auto-Detected Metadata Preview */}
            {extractedVideoId && (
              <div className="p-3 rounded-xl bg-[#131318] border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    YouTube Thumbnail & Metadata Ready (ID: {extractedVideoId})
                  </span>
                  {fetchingMeta && (
                    <span className="inline-flex items-center gap-1 text-zinc-400 text-[11px]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Syncing YouTube info...
                    </span>
                  )}
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-white/10">
                  <img
                    src={getYouTubeThumbnailUrl(extractedVideoId)}
                    alt="YouTube Live Thumbnail Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1.5 rounded border border-white/10">
                    <p className="text-xs font-bold text-white truncate">
                      {title || 'YouTube Stream'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stream Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Stream Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-filled from YouTube or enter custom title"
                className="w-full bg-[#131318] text-sm text-white placeholder-zinc-500 px-3.5 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
              />
            </div>

            {/* Stream Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Stream Description
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Auto-filled from YouTube description or add details about your live stream..."
                  className="w-full bg-[#131318] text-xs text-white placeholder-zinc-500 pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Stream Category
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#131318] text-sm text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#131318] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-sm shadow-lg shadow-[#e11d48]/30 flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <Youtube className="w-4 h-4" />
              Publish to Public Feed ({selectedStatus === 'LIVE' ? 'Live Now' : selectedStatus === 'UPCOMING' ? 'Upcoming Live' : 'Past Live'})
            </button>
          </form>
        </>
      )}
    </div>
  );
};
