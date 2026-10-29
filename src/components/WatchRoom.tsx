import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Send,
  Gift,
  Eye,
  Gem,
  MessageSquare,
  Youtube,
  Check,
  Clock,
  Sparkles,
  X,
  Info,
  Calendar,
} from 'lucide-react';
import {
  StreamItem,
  ChatMessage,
  GiftItem,
  STANDARD_GIFTS,
  getYouTubeThumbnailUrl,
} from '../utils/streamLogic';

interface WatchRoomProps {
  stream: StreamItem;
  messages: ChatMessage[];
  userGems: number;
  onBack: () => void;
  onSendMessage: (streamId: string, text: string) => void;
  onSendGift: (streamId: string, gift: GiftItem) => void;
}

export const WatchRoom: React.FC<WatchRoomProps> = ({
  stream,
  messages,
  userGems,
  onBack,
  onSendMessage,
  onSendGift,
}) => {
  const [chatTab, setChatTab] = useState<'APP' | 'YOUTUBE'>('APP');
  const [inputText, setInputText] = useState('');
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isLive = stream.status === 'LIVE';
  const isUpcoming = stream.status === 'UPCOMING';
  const embedDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(stream.id, trimmed);
    setInputText('');
  };

  const handleShare = async () => {
    const shareUrl = `https://www.youtube.com/live/${stream.videoId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      }
    } catch {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] bg-[#0b0b0e]">
      {/* Sticky Top Bar + 16:9 Real YouTube IFrame Player */}
      <div className="sticky top-0 z-30 bg-[#0b0b0e] border-b border-white/[0.08] shadow-xl">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0b0b0e]/95 backdrop-blur-md">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg bg-white/[0.05] active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>

          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#e11d48] text-white text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : isUpcoming ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500 text-black text-[11px] font-bold uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                UPCOMING LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase border border-white/10">
                <Clock className="w-3 h-3 text-zinc-400" />
                PAST STREAM
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-300 bg-white/[0.05] px-2 py-0.5 rounded">
              <Eye className="w-3.5 h-3.5 text-[#e11d48]" />
              {stream.viewerCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 16:9 Official YouTube IFrame Embed */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${stream.videoId}?autoplay=1&playsinline=1&rel=0`}
            title={stream.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {/* Stream Details, Thumbnail Preview & Creator Action Bar */}
      <div className="p-3.5 bg-[#131318] border-b border-white/[0.08]">
        <div className="flex items-start gap-3">
          <img
            src={getYouTubeThumbnailUrl(stream.videoId)}
            alt={stream.title}
            className="w-20 h-12 rounded-lg object-cover border border-white/10 shrink-0 hidden sm:block"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-[#f4f4f6] leading-snug">{stream.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
              <span className="text-zinc-300 font-medium">{stream.category}</span>
              <span>•</span>
              <span>
                {isLive
                  ? stream.startedAt
                  : isUpcoming
                    ? `Scheduled: ${stream.scheduledFor || 'Upcoming'}`
                    : stream.endedAt || 'Full Broadcast Replay'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-amber-400 font-mono font-semibold">
                <Gem className="w-3.5 h-3.5" />
                {stream.receivedGems} Gems Received
              </span>
            </div>
          </div>
        </div>

        {/* Real YouTube Stream Description Box */}
        {stream.description && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#0b0b0e]/70 border border-white/[0.06] text-xs text-zinc-300">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-[#e11d48]" />
                Stream Description
              </span>
              {stream.description.length > 120 && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="text-[11px] font-semibold text-[#fb7185] hover:underline"
                >
                  {showFullDesc ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
            <p className={`leading-relaxed whitespace-pre-line text-zinc-300 ${showFullDesc ? '' : 'line-clamp-2'}`}>
              {stream.description}
            </p>
          </div>
        )}

        {/* Creator Channel Row */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={stream.channelAvatar}
              alt={stream.channelName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = `data:image/svg+xml;utf8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#e11d48"/><text x="50%" y="54%" fill="#ffffff" font-family="sans-serif" font-size="34" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${(
                    stream.channelName?.[0] || 'A'
                  ).toUpperCase()}</text></svg>`
                )}`;
              }}
              className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0 bg-zinc-800"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{stream.channelName}</p>
              <p className="text-[11px] text-zinc-400">{stream.subscriberCount} subscribers</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={stream.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold transition shadow-md shadow-[#e11d48]/25 active:scale-95"
            >
              <Youtube className="w-3.5 h-3.5" />
              Subscribe on YouTube
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-semibold border border-white/10 transition active:scale-95"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Live Chat Section */}
      <div className="flex-1 flex flex-col bg-[#0b0b0e]">
        {/* Chat Mode Switcher Tabs */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#131318]/70 border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChatTab('APP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatTab === 'APP'
                  ? 'bg-[#e11d48] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              App Live Chat ({messages.length})
            </button>
            <button
              onClick={() => setChatTab('YOUTUBE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatTab === 'YOUTUBE'
                  ? 'bg-[#e11d48] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              YouTube Live Chat
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            <Gem className="w-3.5 h-3.5" />
            <span>{userGems}</span>
          </div>
        </div>

        {chatTab === 'APP' ? (
          <>
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[340px] min-h-[220px]">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No chat messages yet. Say hello or send a gift to support {stream.channelName}!
                </div>
              ) : (
                messages.map((msg) =>
                  msg.isGift ? (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-[#e11d48]/15 to-transparent border border-amber-500/30 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
                        {msg.giftEmoji || '🎁'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-amber-300">{msg.author}</span>
                          <span className="text-[10px] font-mono text-amber-200/80 bg-amber-500/20 px-1.5 py-0.5 rounded">
                            +{msg.giftCost} Gems
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium mt-0.5">{msg.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={msg.authorAvatar}
                        alt={msg.author}
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-white/10"
                      />
                      <div className="min-w-0 flex-1 bg-[#131318] px-3 py-2 rounded-xl border border-white/[0.05]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-zinc-300">{msg.author}</span>
                          <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-zinc-100 mt-0.5 break-words leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input & Send Gift Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 bg-[#131318] border-t border-white/[0.08] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Chat in ${stream.channelName}'s room...`}
                className="flex-1 bg-[#0b0b0e] text-xs text-white placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#e11d48]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-40 text-white transition active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGiftDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#e11d48] to-rose-600 text-white text-xs font-bold shadow-md shadow-[#e11d48]/30 active:scale-95 transition shrink-0"
              >
                <Gift className="w-4 h-4" />
                <span>Send Gift 🎁</span>
              </button>
            </form>
          </>
        ) : (
          /* Real YouTube Live Chat Embed */
          <div className="flex-1 flex flex-col min-h-[300px] bg-[#131318]">
            <iframe
              title="YouTube Live Chat"
              src={`https://www.youtube.com/live_chat?v=${stream.videoId}&embed_domain=${embedDomain}`}
              className="w-full h-[320px] border-0"
            />
            <div className="px-3.5 py-2 bg-[#0b0b0e] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
              <span>Official YouTube Live Chat Embed ({stream.videoId})</span>
              <a
                href={`https://www.youtube.com/live/${stream.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#fb7185] hover:underline inline-flex items-center gap-1 font-medium"
              >
                Open on YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Virtual Gift Drawer */}
      {isGiftDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#131318] border-t border-white/15 rounded-t-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Support {stream.channelName}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                  <Gem className="w-3.5 h-3.5" />
                  {userGems} Gems
                </span>
                <button
                  onClick={() => setIsGiftDrawerOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white bg-white/[0.05]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              {STANDARD_GIFTS.map((gift) => {
                const canAfford = userGems >= gift.cost;
                return (
                  <button
                    key={gift.id}
                    onClick={() => {
                      onSendGift(stream.id, gift);
                      if (canAfford) setIsGiftDrawerOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition active:scale-95 ${
                      canAfford
                        ? 'bg-[#1a1a22] hover:bg-white/[0.08] border-white/10 hover:border-[#e11d48]/50'
                        : 'bg-[#131318] border-white/5 opacity-50'
                    }`}
                  >
                    <span className="text-2xl mb-1">{gift.emoji}</span>
                    <span className="text-xs font-bold text-white">{gift.name}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
                      <Gem className="w-3 h-3" />
                      {gift.cost}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-center text-zinc-400">
              Sending a gift highlights your message in live chat and adds Gems to the creator&apos;s channel.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
