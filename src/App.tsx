import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  Radio,
  Gem,
  User as UserIcon,
  Search,
  Tv,
  History,
  Sparkles,
  CheckCircle2,
  X,
  RefreshCw,
  Calendar,
  PlusCircle,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  StreamItem,
  StreamStatus,
  FeedFilter,
  CreatorProfile,
  ChatMessage,
  GiftItem,
  YouTubeSyncVideoResult,
  INITIAL_STREAMS,
  INITIAL_CHAT_MESSAGES,
  partitionAndFilterStreams,
  applyYouTubeAutoSync,
  processGiftTransaction,
  getYouTubeThumbnailUrl,
} from './utils/streamLogic';
import { StreamCard } from './components/StreamCard';
import { WatchRoom } from './components/WatchRoom';
import { CastLiveView } from './components/CastLiveView';
import { GemsStoreView } from './components/GemsStoreView';
import { CreatorChannelView } from './components/CreatorChannelView';

type NavTab = 'HOME' | 'CAST' | 'GEMS' | 'CHANNEL';

const STORAGE_KEYS = {
  STREAMS: 'sl_bus_gaming_streams_v5_real',
  GEMS: 'sl_bus_gaming_user_gems_v5',
  CHAT: 'sl_bus_gaming_chat_v5',
};

export default function App() {
  // Firebase Auth User State (NO fake pre-logged-in profile!)
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);

  // Firestore + Local Streams State (Starts with the 4 real Automaker Past Live streams; NO fake live videos)
  const [firestoreStreams, setFirestoreStreams] = useState<StreamItem[]>([]);
  const [localStreams, setLocalStreams] = useState<StreamItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STREAMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_STREAMS;
  });

  const [userGems, setUserGems] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GEMS);
      if (saved !== null) {
        const num = Number(saved);
        if (!Number.isNaN(num)) return num;
      }
    } catch {
      // Fallback
    }
    return 100;
  });

  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_CHAT_MESSAGES;
  });

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingYouTube, setIsSyncingYouTube] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Merge Firestore public streams with the 4 real Automaker Past Live seed streams
  const streams = useMemo(() => {
    const byVideoId = new Map<string, StreamItem>();
    // First load local/initial real streams
    for (const s of localStreams) {
      byVideoId.set(s.videoId, s);
    }
    // Firestore streams override by videoId so real-time status & creator updates take priority
    for (const fsStream of firestoreStreams) {
      byVideoId.set(fsStream.videoId, fsStream);
    }
    return Array.from(byVideoId.values());
  }, [localStreams, firestoreStreams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STREAMS, JSON.stringify(localStreams));
    } catch {
      // Ignore storage quota errors
    }
  }, [localStreams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GEMS, String(userGems));
    } catch {
      // Ignore
    }
  }, [userGems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(chatMessages));
    } catch {
      // Ignore
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Verify Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setCreatorProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Listen to authenticated creator's channel profile in Firestore (`channels/{uid}`)
  useEffect(() => {
    if (!authUser) return;
    const channelRef = doc(db, 'channels', authUser.uid);
    const unsub = onSnapshot(
      channelRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCreatorProfile({
            uid: authUser.uid,
            email: authUser.email || undefined,
            channelName: data.channelName || authUser.displayName || 'Creator Channel',
            channelUrl: data.channelUrl || 'https://www.youtube.com/@AutomakerLk',
            avatarUrl: data.avatarUrl || authUser.photoURL || '',
            subscriberCount: data.subscriberCount || '10.8K',
            receivedGems: typeof data.receivedGems === 'number' ? data.receivedGems : 0,
          });
        } else {
          // Initialize default profile from Google account without fake data
          setCreatorProfile({
            uid: authUser.uid,
            email: authUser.email || undefined,
            channelName: authUser.displayName || 'My YouTube Channel',
            channelUrl: 'https://www.youtube.com/@AutomakerLk',
            avatarUrl: authUser.photoURL || '',
            subscriberCount: '10.8K',
            receivedGems: 0,
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `channels/${authUser.uid}`);
      }
    );
    return () => unsub();
  }, [authUser]);

  // Listen to public streams in Firestore (`streams` where `isPublic == true`)
  useEffect(() => {
    const q = query(collection(db, 'streams'), where('isPublic', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: StreamItem[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: docSnap.id,
            videoId: d.videoId,
            title: d.title,
            description: d.description || '',
            channelName: d.channelName,
            channelUrl: d.channelUrl,
            channelAvatar: d.channelAvatar,
            subscriberCount: d.subscriberCount || '10.8K',
            status: (d.status as StreamStatus) || 'PAST',
            viewerCount: typeof d.viewerCount === 'number' ? d.viewerCount : 0,
            peakViewers: typeof d.peakViewers === 'number' ? d.peakViewers : 0,
            startedAt: d.startedAt || 'Streamed on YouTube',
            endedAt: d.endedAt,
            scheduledFor: d.scheduledFor,
            durationLabel: d.durationLabel,
            thumbnailUrl: d.thumbnailUrl || getYouTubeThumbnailUrl(d.videoId),
            category: d.category || 'FTB Sri Lanka • Convoy',
            receivedGems: typeof d.receivedGems === 'number' ? d.receivedGems : 0,
            creatorId: d.creatorId,
            isPublic: d.isPublic !== false,
          });
        });
        setFirestoreStreams(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'streams');
      }
    );
    return () => unsub();
  }, []);

  /**
   * Automatic YouTube Live Status, Thumbnail, Title & Description Sync
   * Whenever a live stream ends on YouTube, it automatically transitions to PAST LIVE STREAMS.
   */
  const syncStreamsWithYouTube = useCallback(async (currentStreams: StreamItem[]) => {
    const videoIds = Array.from(new Set(currentStreams.map((s) => s.videoId).filter(Boolean)));
    if (videoIds.length === 0) return;

    setIsSyncingYouTube(true);
    try {
      const response = await fetch('/api/youtube/sync-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        results?: Record<string, YouTubeSyncVideoResult>;
      };
      if (!data.results) return;

      setLocalStreams((prev) => {
        const { streams: nextStreams, autoEndedTitles, changed } = applyYouTubeAutoSync(
          prev,
          data.results!
        );
        if (autoEndedTitles.length > 0) {
          setToastMessage(
            `YouTube Live ended: "${autoEndedTitles[0]}" moved to Past Live Streams.`
          );
        }
        return changed ? nextStreams : prev;
      });
    } catch {
      // Ignore transient network errors
    } finally {
      setIsSyncingYouTube(false);
    }
  }, []);

  useEffect(() => {
    syncStreamsWithYouTube(streams);
    const interval = setInterval(() => {
      syncStreamsWithYouTube(streams);
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStream = useMemo(
    () => streams.find((s) => s.id === selectedStreamId) || null,
    [streams, selectedStreamId]
  );

  const { liveStreams, upcomingStreams, pastStreams } = useMemo(
    () => partitionAndFilterStreams(streams, feedFilter, searchQuery),
    [streams, feedFilter, searchQuery]
  );

  const totalLiveCount = useMemo(
    () => streams.filter((s) => s.status === 'LIVE').length,
    [streams]
  );
  const totalUpcomingCount = useMemo(
    () => streams.filter((s) => s.status === 'UPCOMING').length,
    [streams]
  );
  const totalPastCount = useMemo(
    () => streams.filter((s) => s.status === 'PAST').length,
    [streams]
  );

  // Firebase Google Sign-In handler
  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      showToast(`Signed in as ${cred.user.displayName || cred.user.email}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked by popup settings.'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('Signed out of Creator Studio.');
    } catch {
      // Ignore
    }
  };

  // Save Creator YouTube Channel Profile to Firestore (`channels/{uid}`)
  const handleSaveChannelProfile = async (profile: CreatorProfile) => {
    setCreatorProfile(profile);
    if (!authUser) return;

    const path = `channels/${authUser.uid}`;
    try {
      await setDoc(
        doc(db, 'channels', authUser.uid),
        {
          uid: authUser.uid,
          email: authUser.email || '',
          channelName: profile.channelName,
          channelUrl: profile.channelUrl,
          avatarUrl: profile.avatarUrl,
          subscriberCount: profile.subscriberCount,
          receivedGems: profile.receivedGems || 0,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast(`Channel "${profile.channelName}" synced to Firebase!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Publish a stream (LIVE, UPCOMING, or PAST) to Firestore & Local state
  const handlePublishStream = async (params: {
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
  }) => {
    if (!authUser) {
      showToast('Please sign in with Google first.');
      return;
    }

    const streamId = `yt-${params.videoId}`;
    const newStream: StreamItem = {
      id: streamId,
      videoId: params.videoId,
      title: params.title,
      description:
        params.description ||
        `${params.title} — Published on Sri Lanka Bus Gaming Live.`,
      channelName:
        creatorProfile?.channelName ||
        params.detectedChannelName ||
        authUser.displayName ||
        'Automaker',
      channelUrl:
        creatorProfile?.channelUrl ||
        params.detectedChannelUrl ||
        'https://www.youtube.com/@AutomakerLk',
      channelAvatar:
        creatorProfile?.avatarUrl ||
        params.detectedChannelAvatar ||
        authUser.photoURL ||
        'https://yt3.ggpht.com/n4UELiZHjYg1X5FsMZpdfLl3vdzVcMbm-sxuZycZ3ZhfZyYcvTKoWSa-Sv4zdZEyjUlQrKReZg=s176-c-k-c0x00ffffff-no-rj',
      subscriberCount: creatorProfile?.subscriberCount || '10.8K',
      status: params.status,
      viewerCount: params.status === 'LIVE' ? 1 : 0,
      peakViewers: params.status === 'LIVE' ? 1 : 0,
      startedAt:
        params.status === 'LIVE'
          ? 'Live Now on YouTube'
          : params.status === 'UPCOMING'
            ? params.scheduledFor || 'Upcoming Broadcast'
            : 'Streamed on YouTube',
      endedAt: params.status === 'PAST' ? 'Full Broadcast Replay' : undefined,
      scheduledFor: params.status === 'UPCOMING' ? params.scheduledFor || 'Scheduled Live' : undefined,
      thumbnailUrl: getYouTubeThumbnailUrl(params.videoId),
      category: params.category,
      receivedGems: 0,
      creatorId: authUser.uid,
      isPublic: true,
    };

    setLocalStreams((prev) => [
      newStream,
      ...prev.filter((s) => s.videoId !== params.videoId),
    ]);

    try {
      await setDoc(doc(db, 'streams', streamId), {
        videoId: newStream.videoId,
        title: newStream.title,
        description: newStream.description,
        channelName: newStream.channelName,
        channelUrl: newStream.channelUrl,
        channelAvatar: newStream.channelAvatar,
        subscriberCount: newStream.subscriberCount,
        status: newStream.status,
        viewerCount: newStream.viewerCount,
        peakViewers: newStream.peakViewers,
        startedAt: newStream.startedAt,
        endedAt: newStream.endedAt || '',
        scheduledFor: newStream.scheduledFor || '',
        thumbnailUrl: newStream.thumbnailUrl,
        category: newStream.category,
        receivedGems: newStream.receivedGems,
        creatorId: authUser.uid,
        isPublic: true,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `streams/${streamId}`);
    }

    setActiveTab('HOME');
    setFeedFilter('ALL');
    showToast(
      `Published "${newStream.title}" under ${
        newStream.status === 'LIVE'
          ? 'LIVE NOW 🔴'
          : newStream.status === 'UPCOMING'
            ? 'UPCOMING LIVE 🗓️'
            : 'PAST LIVE STREAMS 📼'
      }!`
    );
  };

  // 1-Click Publish from CreatorChannelView discovered channel videos
  const handleQuickPublishChannelVideo = async (video: {
    videoId: string;
    title: string;
    description: string;
    status: StreamStatus;
    scheduledFor?: string;
    channelName: string;
    channelUrl: string;
    channelAvatar: string;
    subscriberCount: string;
  }) => {
    await handlePublishStream({
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      category: 'FTB Sri Lanka • Convoy',
      thumbnailUrl: getYouTubeThumbnailUrl(video.videoId),
      status: video.status,
      scheduledFor: video.scheduledFor,
      detectedChannelName: video.channelName,
      detectedChannelUrl: video.channelUrl,
      detectedChannelAvatar: video.channelAvatar,
    });
  };

  // Update stream status (UPCOMING / LIVE / PAST) by its creator
  const handleUpdateStreamStatus = async (streamId: string, newStatus: StreamStatus) => {
    setLocalStreams((prev) =>
      prev.map((s) => (s.id === streamId ? { ...s, status: newStatus } : s))
    );

    if (!authUser) return;
    const target = streams.find((s) => s.id === streamId);
    if (!target) return;

    try {
      const docRef = doc(db, 'streams', streamId);
      await setDoc(
        docRef,
        {
          ...target,
          status: newStatus,
          creatorId: target.creatorId || authUser.uid,
          isPublic: true,
        },
        { merge: true }
      );
      showToast(`Updated stream status to ${newStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `streams/${streamId}`);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    setLocalStreams((prev) => prev.filter((s) => s.id !== streamId));
    if (!authUser) return;
    try {
      await deleteDoc(doc(db, 'streams', streamId));
      showToast('Stream removed from public feed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `streams/${streamId}`);
    }
  };

  const handleSendMessage = (streamId: string, text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      streamId,
      author: creatorProfile?.channelName || authUser?.displayName || 'Viewer_LK',
      authorAvatar:
        creatorProfile?.avatarUrl ||
        authUser?.photoURL ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      text,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => ({
      ...prev,
      [streamId]: [...(prev[streamId] || []), newMsg],
    }));
  };

  const handleSendGift = async (streamId: string, gift: GiftItem) => {
    const senderName = creatorProfile?.channelName || authUser?.displayName || 'Viewer_LK';
    const result = processGiftTransaction({
      userGems,
      gift,
      streamId,
      senderName,
      streams,
      creatorProfile,
    });

    if (result.ok === false) {
      showToast(result.error);
      return;
    }

    setUserGems(result.newUserGems);
    setLocalStreams(result.updatedStreams);
    if (result.updatedCreatorProfile) {
      setCreatorProfile(result.updatedCreatorProfile);
    }
    setChatMessages((prev) => ({
      ...prev,
      [streamId]: [...(prev[streamId] || []), result.giftMessage],
    }));
    showToast(`Sent ${gift.name} ${gift.emoji} (${gift.cost} Gems)!`);

    // Also increment receivedGems in Firestore if this stream exists in Firestore
    const fsStream = firestoreStreams.find((s) => s.id === streamId);
    if (fsStream) {
      try {
        await updateDoc(doc(db, 'streams', streamId), {
          receivedGems: fsStream.receivedGems + gift.cost,
        });
      } catch {
        // Ignore if guest
      }
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#0b0b0e] text-[#f4f4f6] flex flex-col font-sans selection:bg-[#e11d48] selection:text-white">
      {/* Top App Bar (Hidden when inside WatchRoom for maximum video viewport) */}
      {!selectedStream && (
        <header className="sticky top-0 z-30 bg-[#0b0b0e]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            {/* Brand Identity */}
            <div
              onClick={() => {
                setActiveTab('HOME');
                setSelectedStreamId(null);
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e11d48] to-rose-700 flex items-center justify-center shadow-md shadow-[#e11d48]/30 shrink-0">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                    SL Bus Gaming
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#e11d48] text-white rounded">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  Sri Lanka Bus Gaming Live & Past Broadcasts
                </p>
              </div>
            </div>

            {/* Right Controls: Sync Status, Gems Pill & Quick Cast Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncStreamsWithYouTube(streams)}
                title="Sync YouTube Live Status & Thumbnails"
                className="p-2 rounded-xl bg-[#131318] hover:bg-white/[0.06] border border-white/10 text-zinc-300 transition active:scale-95"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncingYouTube ? 'animate-spin text-[#e11d48]' : ''}`}
                />
              </button>

              <button
                onClick={() => {
                  setSelectedStreamId(null);
                  setActiveTab('GEMS');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131318] hover:bg-white/[0.06] border border-amber-500/30 text-xs font-mono font-bold text-amber-400 transition active:scale-95"
              >
                <Gem className="w-3.5 h-3.5 text-amber-400" />
                <span>{userGems}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStreamId(null);
                  setActiveTab('CAST');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold shadow-md shadow-[#e11d48]/25 transition active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>+ Cast Live</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#131318] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto">
        {selectedStream ? (
          <WatchRoom
            stream={selectedStream}
            messages={chatMessages[selectedStream.id] || []}
            userGems={userGems}
            onBack={() => setSelectedStreamId(null)}
            onSendMessage={handleSendMessage}
            onSendGift={handleSendGift}
          />
        ) : activeTab === 'HOME' ? (
          <div className="p-4 space-y-6 pb-24">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFeedFilter('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    feedFilter === 'ALL'
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-[#131318] text-zinc-400 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  All ({streams.length})
                </button>
                <button
                  onClick={() => setFeedFilter('LIVE')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    feedFilter === 'LIVE'
                      ? 'bg-[#e11d48] text-white shadow-md shadow-[#e11d48]/30'
                      : 'bg-[#131318] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <span>Live Now 🔴</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/30 text-[11px] font-mono">
                    {totalLiveCount}
                  </span>
                </button>
                <button
                  onClick={() => setFeedFilter('UPCOMING')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    feedFilter === 'UPCOMING'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                      : 'bg-[#131318] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <span>Upcoming 🗓️</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/20 text-[11px] font-mono">
                    {totalUpcomingCount}
                  </span>
                </button>
                <button
                  onClick={() => setFeedFilter('PAST')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    feedFilter === 'PAST'
                      ? 'bg-zinc-200 text-black'
                      : 'bg-[#131318] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <span>Past Lives 📼</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/20 text-[11px] font-mono">
                    {totalPastCount}
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streams, creators..."
                  className="w-full bg-[#131318] text-xs text-white placeholder-zinc-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#e11d48]"
                />
              </div>
            </div>

            {/* SECTION 1: TOP PRIORITY — 🔴 LIVE NOW */}
            {(feedFilter === 'ALL' || feedFilter === 'LIVE') && (
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] animate-ping" />
                    <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white uppercase">
                      🔴 LIVE NOW
                    </h2>
                    <span className="text-xs font-mono text-zinc-400">
                      ({liveStreams.length} active)
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('CAST')}
                    className="text-xs font-semibold text-[#fb7185] hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Publish Live / Upcoming
                  </button>
                </div>

                {liveStreams.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-[#131318] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-bold text-white">
                        No creators are broadcasting live at this exact moment.
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Only real active YouTube Live broadcasts appear here. Watch the Past Live Streams below or connect your YouTube channel to go live!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('CHANNEL')}
                      className="px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-md shadow-[#e11d48]/25 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Connect Channel / Add Live
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveStreams.map((stream) => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        onSelect={(s) => setSelectedStreamId(s.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 2: 🗓️ UPCOMING LIVE STREAMS */}
            {(feedFilter === 'UPCOMING' ||
              (feedFilter === 'ALL' && upcomingStreams.length > 0)) && (
              <section className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white uppercase">
                      🗓️ UPCOMING LIVE STREAMS
                    </h2>
                    <span className="text-xs font-mono text-zinc-400">
                      ({upcomingStreams.length} scheduled)
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('CAST')}
                    className="text-xs font-semibold text-amber-400 hover:underline"
                  >
                    + Add Upcoming Live Link
                  </button>
                </div>

                {upcomingStreams.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#131318] border border-white/[0.08] text-center space-y-2">
                    <p className="text-xs font-bold text-zinc-200">
                      No upcoming scheduled broadcasts yet.
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Creators can sign in with Google and paste their upcoming YouTube Live link to notify viewers.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingStreams.map((stream) => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        onSelect={(s) => setSelectedStreamId(s.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 3: 📼 PAST LIVE STREAMS (PERMANENT REPLAY ARCHIVE) */}
            {(feedFilter === 'ALL' || feedFilter === 'PAST') && (
              <section className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white uppercase">
                      📼 PAST LIVE STREAMS
                    </h2>
                    <span className="text-xs font-mono text-zinc-400">
                      ({pastStreams.length} replays)
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    Ended YouTube broadcasts automatically move here with full replay
                  </span>
                </div>

                {pastStreams.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#131318] border border-white/[0.08] text-center">
                    <p className="text-sm font-bold text-zinc-300">No past streams found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastStreams.map((stream) => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        onSelect={(s) => setSelectedStreamId(s.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : activeTab === 'CAST' ? (
          <CastLiveView
            isAuthenticated={Boolean(authUser)}
            userEmail={authUser?.email}
            creatorProfile={creatorProfile}
            onGoogleSignIn={handleGoogleSignIn}
            onPublishStream={handlePublishStream}
            onNavigateToChannel={() => setActiveTab('CHANNEL')}
          />
        ) : activeTab === 'GEMS' ? (
          <GemsStoreView
            userGems={userGems}
            onLockedAttempt={() =>
              showToast('Payment Gateway Under Maintenance — Gem purchases are currently locked.')
            }
          />
        ) : (
          <CreatorChannelView
            isAuthenticated={Boolean(authUser)}
            authUser={
              authUser
                ? {
                    uid: authUser.uid,
                    displayName: authUser.displayName,
                    email: authUser.email,
                    photoURL: authUser.photoURL,
                  }
                : null
            }
            creatorProfile={creatorProfile}
            streams={streams}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
            onSaveProfile={handleSaveChannelProfile}
            onQuickPublishChannelVideo={handleQuickPublishChannelVideo}
            onUpdateStreamStatus={handleUpdateStreamStatus}
            onDeleteStream={handleDeleteStream}
            onSelectStream={(s) => setSelectedStreamId(s.id)}
            onNavigateToCast={() => setActiveTab('CAST')}
            onSyncNow={() => syncStreamsWithYouTube(streams)}
            isSyncing={isSyncingYouTube}
          />
        )}
      </main>

      {/* Fixed 4-Tab Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0b0b0e]/95 backdrop-blur-lg border-t border-white/[0.08] px-2">
        <div className="max-w-lg mx-auto h-full grid grid-cols-4 items-center">
          <button
            onClick={() => {
              setSelectedStreamId(null);
              setActiveTab('HOME');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition ${
              activeTab === 'HOME' && !selectedStream
                ? 'text-[#e11d48]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px] font-bold">Home</span>
          </button>

          <button
            onClick={() => {
              setSelectedStreamId(null);
              setActiveTab('CAST');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition ${
              activeTab === 'CAST' && !selectedStream
                ? 'text-[#e11d48]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="text-[11px] font-bold">Cast Live</span>
          </button>

          <button
            onClick={() => {
              setSelectedStreamId(null);
              setActiveTab('GEMS');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition ${
              activeTab === 'GEMS' && !selectedStream
                ? 'text-[#e11d48]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Gem className="w-5 h-5" />
            <span className="text-[11px] font-bold">Gems</span>
          </button>

          <button
            onClick={() => {
              setSelectedStreamId(null);
              setActiveTab('CHANNEL');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition ${
              activeTab === 'CHANNEL' && !selectedStream
                ? 'text-[#e11d48]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[11px] font-bold">Channel</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
