import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  partitionAndFilterStreams,
  applyYouTubeAutoSync,
  processGiftTransaction,
  INITIAL_STREAMS,
  STANDARD_GIFTS,
} from './streamLogic.ts';

describe('extractYouTubeVideoId', () => {
  it('extracts videoId from standard watch URL', () => {
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=5qap5aO4i9A&ab_channel=Test'),
      '5qap5aO4i9A'
    );
  });

  it('extracts videoId from youtube.com/live/ URL with si query parameter', () => {
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/live/i01DnisYrZg?si=Mjt0Zb5IrbdjxcX4'),
      'i01DnisYrZg'
    );
    assert.equal(
      extractYouTubeVideoId('https://www.youtube.com/live/5Lz3AtDooy8?si=c4UslF_kQJY5rbqm'),
      '5Lz3AtDooy8'
    );
  });

  it('extracts videoId from youtu.be short URL', () => {
    assert.equal(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('returns null for invalid URLs', () => {
    assert.equal(extractYouTubeVideoId('https://example.com/not-youtube'), null);
    assert.equal(extractYouTubeVideoId(''), null);
  });
});

describe('getYouTubeThumbnailUrl', () => {
  it('builds hqdefault YouTube thumbnail URL for any videoId', () => {
    assert.equal(
      getYouTubeThumbnailUrl('i01DnisYrZg'),
      'https://i.ytimg.com/vi/i01DnisYrZg/hqdefault.jpg'
    );
  });
});

describe('INITIAL_STREAMS integrity', () => {
  it('contains no fake LIVE streams by default and keeps the 4 real Automaker PAST streams', () => {
    const live = INITIAL_STREAMS.filter((s) => s.status === 'LIVE');
    const past = INITIAL_STREAMS.filter((s) => s.status === 'PAST');
    assert.equal(live.length, 0);
    assert.equal(past.length, 4);
    assert.deepEqual(
      past.map((s) => s.videoId),
      ['i01DnisYrZg', '5Lz3AtDooy8', 'wz5n2ugAzP4', 'onshPEQfaD8']
    );
  });
});

describe('partitionAndFilterStreams', () => {
  it('correctly separates LIVE, UPCOMING, and PAST streams', () => {
    const testStreams = [
      ...INITIAL_STREAMS,
      {
        ...INITIAL_STREAMS[0],
        id: 'test-upcoming',
        videoId: 'aaaaaaaaaaa',
        status: 'UPCOMING' as const,
        scheduledFor: 'Tonight 8:00 PM',
      },
      {
        ...INITIAL_STREAMS[0],
        id: 'test-live',
        videoId: 'bbbbbbbbbbb',
        status: 'LIVE' as const,
      },
    ];

    const all = partitionAndFilterStreams(testStreams, 'ALL');
    assert.equal(all.liveStreams.length, 1);
    assert.equal(all.upcomingStreams.length, 1);
    assert.equal(all.pastStreams.length, 4);

    const upcomingOnly = partitionAndFilterStreams(testStreams, 'UPCOMING');
    assert.equal(upcomingOnly.liveStreams.length, 0);
    assert.equal(upcomingOnly.upcomingStreams.length, 1);
    assert.equal(upcomingOnly.pastStreams.length, 0);
  });
});

describe('applyYouTubeAutoSync', () => {
  it('automatically moves a LIVE stream to PAST when YouTube reports isLive: false', () => {
    const sample = [
      {
        ...INITIAL_STREAMS[0],
        id: 'live-test',
        videoId: 'i01DnisYrZg',
        status: 'LIVE' as const,
      },
    ];

    const result = applyYouTubeAutoSync(sample, {
      i01DnisYrZg: {
        videoId: 'i01DnisYrZg',
        isLive: false,
        title: 'බස් ගේම් එකේ මිතුදම් චාරිකාව 01 | Automaker is Live!',
        description: 'ලංකාවේ බස් ගේම් එක | FTB (Future Tech Bus)',
        thumbnailUrl: 'https://i.ytimg.com/vi/i01DnisYrZg/hqdefault.jpg',
      },
    });

    assert.equal(result.changed, true);
    assert.equal(result.streams[0].status, 'PAST');
    assert.equal(result.autoEndedTitles.length, 1);
  });

  it('automatically moves an UPCOMING stream to LIVE when YouTube reports isLive: true', () => {
    const sample = [
      {
        ...INITIAL_STREAMS[0],
        id: 'upcoming-test',
        videoId: 'i01DnisYrZg',
        status: 'UPCOMING' as const,
      },
    ];

    const result = applyYouTubeAutoSync(sample, {
      i01DnisYrZg: {
        videoId: 'i01DnisYrZg',
        isLive: true,
        isUpcoming: false,
        title: 'Automaker Live Now!',
      },
    });

    assert.equal(result.changed, true);
    assert.equal(result.streams[0].status, 'LIVE');
  });
});

describe('processGiftTransaction', () => {
  it('deducts gems, increments stream gems, and creates a gift chat message', () => {
    const starGift = STANDARD_GIFTS[0]; // 10 Gems
    const targetStream = INITIAL_STREAMS[0];
    const initialStreamGems = targetStream.receivedGems;

    const res = processGiftTransaction({
      userGems: 100,
      gift: starGift,
      streamId: targetStream.id,
      senderName: 'TestViewer',
      streams: INITIAL_STREAMS,
      creatorProfile: null,
    });

    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.newUserGems, 90);
      const updated = res.updatedStreams.find((s) => s.id === targetStream.id)!;
      assert.equal(updated.receivedGems, initialStreamGems + 10);
      assert.equal(res.giftMessage.isGift, true);
    }
  });
});
