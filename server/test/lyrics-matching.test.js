const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LYRICS_APPROVED_CACHE_SOURCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  buildLyricsCacheKey,
  buildLyricsLookupCandidates,
  canWriteApprovedLyricsCache,
  buildMusicTrackKey,
  isUsableLyricsCache,
  normalizeLyricsText,
  parseYouTubeMusicTitle,
  scoreMusicVideoCandidate,
  getLyricsMatchDetails,
  MIN_LYRICS_CONFIDENCE,
  scoreLyricsMatch,
  isReliableLyricsMatch
} = require('../routes/lyrics-routes');

test('parses common YouTube music titles without keeping video suffixes', () => {
  const parsed = parseYouTubeMusicTitle('Don Toliver - No Idea [Official Music Video]', 'DonToliverVEVO');

  assert.equal(parsed.trackOriginal, 'No Idea');
  assert.equal(parsed.artistOriginal, 'Don Toliver');
  assert.equal(parsed.track, 'no idea');
  assert.equal(parsed.artist, 'don toliver');
});

test('normalizes music metadata consistently', () => {
  assert.equal(normalizeLyricsText('Raindance (Official Audio) [HD]'), 'raindance');
  assert.equal(normalizeLyricsText('No Idea ft. Artist - Official Video'), 'no idea artist');
});

test('builds lyrics lookup variants without featured artists', () => {
  const candidates = buildLyricsLookupCandidates('Raindance ft. Tems', 'Dave');

  assert.deepEqual(candidates.slice(0, 2), [
    { track: 'Raindance ft. Tems', artist: 'Dave' },
    { track: 'Raindance', artist: 'Dave' }
  ]);
});

test('builds lyrics lookup variants for featured tracks and artist aliases', () => {
  const candidates = buildLyricsLookupCandidates('Song Name (Official Audio) ft. Guest', 'Main Artist & Guest Artist');

  assert.ok(candidates.some((candidate) => candidate.track === 'Song Name' && candidate.artist === 'Main Artist & Guest Artist'));
  assert.ok(candidates.some((candidate) => candidate.track === 'Song Name' && candidate.artist === 'Main Artist'));
  assert.ok(candidates.some((candidate) => candidate.track === 'Song Name' && candidate.artist === 'Guest Artist'));
  assert.ok(candidates.some((candidate) => candidate.track === 'Song Name' && candidate.artist === ''));
});

test('scores official music video above weak music search candidates', () => {
  const official = scoreMusicVideoCandidate({
    title: 'Dave - Raindance ft. Tems (Official Video)',
    author: 'DaveVEVO',
    durationSeconds: 218
  }, 'raindance');
  const weak = scoreMusicVideoCandidate({
    title: 'Raindance karaoke slowed remix 1 hour',
    author: 'Random Channel',
    durationSeconds: 3600
  }, 'raindance');

  assert.ok(official > weak);
});

test('accepts only lyrics that match both track and artist', () => {
  const correct = {
    trackName: 'No Idea',
    artistName: 'Don Toliver',
    plainLyrics: 'I know, I know, I know that you drunk'
  };
  const wrongArtist = {
    trackName: 'No Idea',
    artistName: 'Someone Else',
    plainLyrics: 'Wrong song'
  };
  const wrongTrack = {
    trackName: 'Rico',
    artistName: 'Don Toliver',
    plainLyrics: 'Wrong song'
  };

  assert.equal(isReliableLyricsMatch(correct, 'No Idea', 'Don Toliver'), true);
  assert.equal(isReliableLyricsMatch(wrongArtist, 'No Idea', 'Don Toliver'), false);
  assert.equal(isReliableLyricsMatch(wrongTrack, 'No Idea', 'Don Toliver'), false);
  assert.ok(scoreLyricsMatch(correct, 'No Idea', 'Don Toliver') >= MIN_LYRICS_CONFIDENCE);
  assert.ok(scoreLyricsMatch(correct, 'No Idea', 'Don Toliver') > scoreLyricsMatch(wrongTrack, 'No Idea', 'Don Toliver'));
});

test('rejects partial artist matches that commonly return wrong lyrics', () => {
  const wrongArtist = {
    trackName: 'Raindance',
    artistName: 'Dave East',
    plainLyrics: 'Wrong lyrics from another artist'
  };

  const details = getLyricsMatchDetails(wrongArtist, 'Raindance', 'Dave');

  assert.equal(details.trackAccepted, true);
  assert.equal(details.artistAccepted, false);
  assert.equal(isReliableLyricsMatch(wrongArtist, 'Raindance', 'Dave'), false);
});

test('accepts title-only lyrics fallback only for exact track matches', () => {
  const exactTrack = {
    trackName: 'Yellow',
    artistName: 'Coldplay',
    plainLyrics: 'Look at the stars'
  };
  const partialTrack = {
    trackName: 'Yellow Submarine',
    artistName: 'The Beatles',
    plainLyrics: 'Wrong song'
  };

  assert.equal(isReliableLyricsMatch(exactTrack, 'Yellow', ''), true);
  assert.equal(isReliableLyricsMatch(partialTrack, 'Yellow', ''), false);
});

test('rejects remixes and alternate versions unless explicitly requested', () => {
  const remix = {
    trackName: 'No Idea Remix',
    artistName: 'Don Toliver',
    plainLyrics: 'Wrong remix lyrics'
  };

  assert.equal(isReliableLyricsMatch(remix, 'No Idea', 'Don Toliver'), false);
});

test('lyrics cache keys are normalized and versioned', () => {
  assert.equal(
    buildLyricsCacheKey('No Idea [Official Music Video]', 'Don Toliver'),
    `${LYRICS_CACHE_VERSION}::don toliver::no idea`
  );
});

test('music video cache key keeps track and artist separated', () => {
  assert.equal(buildMusicTrackKey('No Idea [Official Video]', 'Don Toliver'), 'no idea|don toliver');
  assert.equal(buildMusicTrackKey('Raindance ft. Tems', 'DaveVEVO'), 'raindance tems|davevevo');
});

test('lyrics cache accepts approved rows without freshness limit', () => {
  const row = {
    track: 'No Idea',
    artist: 'Don Toliver',
    source: LYRICS_APPROVED_CACHE_SOURCE,
    lyrics_payload: JSON.stringify({
      plainLyrics: 'I know, I know, I know that you drunk',
      trackName: 'No Idea',
      artistName: 'Don Toliver'
    }),
    confidence: 999,
    updated_at: '2020-01-01T00:00:00.000Z'
  };

  assert.equal(isUsableLyricsCache(row, 'No Idea', 'Don Toliver'), true);
  assert.equal(isUsableLyricsCache({ ...row, artist: 'Someone Else' }, 'No Idea', 'Don Toliver'), false);
});

test('lyrics cache rejects stale or low confidence provider rows', () => {
  const baseRow = {
    track: 'No Idea',
    artist: 'Don Toliver',
    source: LYRICS_PROVIDER_CACHE_SOURCE,
    lyrics_payload: JSON.stringify({
      plainLyrics: 'I know, I know, I know that you drunk',
      trackName: 'No Idea',
      artistName: 'Don Toliver'
    }),
    confidence: MIN_LYRICS_CONFIDENCE,
    updated_at: new Date().toISOString()
  };

  assert.equal(isUsableLyricsCache(baseRow, 'No Idea', 'Don Toliver'), true);
  assert.equal(isUsableLyricsCache({ ...baseRow, confidence: MIN_LYRICS_CONFIDENCE - 1 }, 'No Idea', 'Don Toliver'), false);
  assert.equal(isUsableLyricsCache({ ...baseRow, updated_at: '2020-01-01T00:00:00.000Z' }, 'No Idea', 'Don Toliver'), false);
});

test('approved lyrics cache writes require token in production or local dev request', () => {
  const localReq = {
    ip: '127.0.0.1',
    headers: {}
  };
  const remoteReq = {
    ip: '203.0.113.10',
    headers: { authorization: 'Bearer secret-token' }
  };

  assert.equal(canWriteApprovedLyricsCache(localReq, { NODE_ENV: 'development' }), true);
  assert.equal(canWriteApprovedLyricsCache(localReq, { NODE_ENV: 'production' }), false);
  assert.equal(canWriteApprovedLyricsCache(remoteReq, { NODE_ENV: 'production', LYRICS_ADMIN_TOKEN: 'secret-token' }), true);
  assert.equal(canWriteApprovedLyricsCache(remoteReq, { NODE_ENV: 'production', LYRICS_ADMIN_TOKEN: 'other-token' }), false);
});

test('single-track selection rejects extra songs, long videos and unrelated cached metadata', () => {
  const { isSingleTrackVideo } = require('../routes/lyrics-routes');
  const candidate = { title: 'Don Toliver - No Pole (Official Audio)', author: 'Don Toliver', durationSeconds: 184, embeddable: true, privacyStatus: 'public' };
  assert.equal(isSingleTrackVideo(candidate, 'don toliver no pole', 184), true);
  assert.equal(isSingleTrackVideo({...candidate,durationSeconds:256}, 'don toliver no pole',184),false);
  assert.equal(isSingleTrackVideo({...candidate,durationSeconds:90}, 'don toliver no pole',184),false);
  assert.equal(isSingleTrackVideo({...candidate,title:'Don Toliver - No Pole medley'}, 'don toliver no pole'),false);
  assert.equal(isSingleTrackVideo({...candidate,title:'Don Toliver full album'}, 'don toliver no pole'),false);
  assert.equal(isSingleTrackVideo({...candidate,title:'Another Track',author:'Another Artist'}, 'don toliver no pole'),false);
  assert.equal(isSingleTrackVideo({...candidate,embeddable:false}, 'don toliver no pole',184),false);
});

test('music search rechecks cached video duration instead of copying another candidate', async t => {
  const { registerLyricsRoutes } = require('../routes/lyrics-routes');
  const routes = {};
  registerLyricsRoutes({get:(path,...handlers)=>{routes[path]=handlers.at(-1);},post:()=>{}}, {
    YOUTUBE_API_KEY:'test-key',
    supabaseGetWorkingMusicVideo:async()=>({video_id:'cached00001',track:'No Pole',artist:'Don Toliver'})
  });
  const item=(id,seconds)=>({id,snippet:{title:'Don Toliver - No Pole (Official Audio)',channelTitle:'Don Toliver'},contentDetails:{duration:`PT${seconds}S`},status:{embeddable:true,privacyStatus:'public'}});
  const metadataRequests=[];
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith('/search')) return Response.json({items:[{id:{videoId:'single00001'}}]});
    if(u.pathname.endsWith('/videos')) {const id=u.searchParams.get('id');metadataRequests.push(id);return Response.json({items:[item(id,id==='cached00001'?256:184)]});}
    if(u.hostname==='lrclib.net') return Response.json({trackName:'No Pole',artistName:'Don Toliver',duration:184,plainLyrics:'Synthetic test text'});
    throw new Error('Unexpected request');
  });
  let body; const res={status(){return this;},json(value){body=value;}};
  await routes['/api/music/search']({query:{q:'don toliver no pole'}},res);
  assert.equal(body.success,true); assert.equal(body.videoId,'single00001');
  assert.deepEqual(body.candidates.map(c=>c.videoId),['single00001']);
  assert.ok(metadataRequests.includes('cached00001'));
});

test('music search retries official audio when the first results contain extra audio', async t => {
  const { registerLyricsRoutes } = require('../routes/lyrics-routes');
  const routes={}; const searches=[];
  registerLyricsRoutes({get:(path,...handlers)=>{routes[path]=handlers.at(-1);},post:()=>{}},{YOUTUBE_API_KEY:'test-key'});
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith('/search')) {
      searches.push(u.searchParams.get('q'));
      return Response.json({items:[{id:{videoId:searches.length===1?'longvid0001':'audiovid001'}}]});
    }
    if(u.pathname.endsWith('/videos')) return Response.json({items:[{id:u.searchParams.get('id'),snippet:{title:'Don Toliver - No Pole (Official Audio)',channelTitle:'Don Toliver'},contentDetails:{duration:searches.length===1?'PT256S':'PT184S'},status:{embeddable:true,privacyStatus:'public'}}]});
    return Response.json({trackName:'No Pole',artistName:'Don Toliver',duration:184,plainLyrics:'Synthetic reference'});
  });
  let body; await routes['/api/music/search']({query:{q:'don toliver no pole'}},{status(){return this;},json(value){body=value;}});
  assert.equal(body.videoId,'audiovid001');assert.equal(searches.length,2);assert.match(searches[1],/official audio/);
});
