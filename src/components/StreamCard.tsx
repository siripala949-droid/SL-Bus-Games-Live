import React, { useState } from 'react';
import { Eye, Play, Clock, Gem, Calendar } from 'lucide-react';
import { StreamItem, getYouTubeThumbnailUrl } from '../utils/streamLogic';

interface StreamCardProps {
  stream: StreamItem;
  onSelect: (stream: StreamItem) => void;
}

export const StreamCard: React.FC<StreamCardProps> = ({ stream, onSelect }) => {
  const isLive = stream.status === 'LIVE';
  const isUpcoming = stream.status === 'UPCOMING';
  const ytThumb = getYouTubeThumbnailUrl(stream.videoId);
  const [imgSrc, setImgSrc] = useState<string>(stream.thumbnailUrl || ytThumb);

  const handleImgError = () => {
    if (imgSrc !== ytThumb) {
      setImgSrc(ytThumb);
    } else if (imgSrc.includes('hqdefault')) {
      setImgSrc(`https://i.ytimg.com/vi/${stream.videoId}/mqdefault.jpg`);
    } else {
      setImgSrc(
        `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#131318"/><text x="50%" y="50%" fill="#e11d48" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle" dominant-baseline="middle">YouTube Live • ${stream.videoId}</text></svg>`
        )}`
      );
    }
  };

  return (
    <article
      onClick={() => onSelect(stream)}
      className="group bg-[#131318] rounded-xl overflow-hidden border border-white/[0.08] active:scale-[0.99] transition-all duration-150 cursor-pointer hover:border-white/20 flex flex-col"
    >
      {/* 16:9 Real YouTube Video Thumbnail Container */}
      <div className="relative aspect-video w-full bg-[#1a1a22] overflow-hidden">
        <img
          src={imgSrc}
          alt={stream.title}
          onError={handleImgError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />

        {/* Top Left Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e11d48] text-white text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-[#e11d48]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE NOW
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/95 text-black text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-amber-500/30">
              <Calendar className="w-3 h-3" />
              UPCOMING LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 backdrop-blur-md text-zinc-200 border border-white/15 text-[11px] font-semibold tracking-wide uppercase">
              <Clock className="w-3 h-3 text-zinc-400" />
              ENDED / REPLAY
            </span>
          )}
        </div>

        {/* Top Right Viewer Count / Scheduled / Views Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-xs font-mono font-medium border border-white/10">
            <Eye className={`w-3.5 h-3.5 ${isLive ? 'text-[#e11d48]' : isUpcoming ? 'text-amber-400' : 'text-zinc-400'}`} />
            {isLive
              ? `${stream.viewerCount.toLocaleString()} watching`
              : isUpcoming
                ? stream.scheduledFor || 'Scheduled'
                : `${stream.viewerCount.toLocaleString()} views`}
          </span>
        </div>

        {/* Bottom Overlay Info */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-200 bg-black/65 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 truncate max-w-[68%]">
            {stream.category}
          </span>
          {stream.receivedGems > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-300 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded border border-amber-500/30">
              <Gem className="w-3 h-3 text-amber-400" />
              {stream.receivedGems}
            </span>
          )}
        </div>

        {/* Center Play Hover Indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
          <div className="w-11 h-11 rounded-full bg-[#e11d48] text-white flex items-center justify-center shadow-lg shadow-[#e11d48]/50">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Creator & Stream Title + Description Info */}
      <div className="p-3.5 flex gap-3 items-start flex-1">
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
          className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0 mt-0.5 bg-zinc-800"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-bold text-[#f4f4f6] leading-snug line-clamp-2 group-hover:text-[#fb7185] transition-colors">
            {stream.title}
          </h3>
          {stream.description && (
            <p className="mt-1 text-[12px] text-[#9ca3af] line-clamp-2 leading-relaxed">
              {stream.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
            <span className="font-semibold text-zinc-200 truncate max-w-[140px]">
              {stream.channelName}
            </span>
            <span>•</span>
            <span className="truncate">
              {isLive
                ? stream.startedAt
                : isUpcoming
                  ? stream.scheduledFor || 'Upcoming Broadcast'
                  : stream.endedAt || 'Past Broadcast Replay'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
