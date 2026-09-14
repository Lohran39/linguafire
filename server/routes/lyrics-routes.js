const { contentKey, isVerified } = require('../services/content-curation');
const { fetchJsonWithTimeout } = require('../services/provider-http');
const {
  withTranslationSlot,
  asTranslationResponse,
  splitTranslationBlock,
  hasTranslationBlock,
  hasMatchingTranslationBlockShape,
  buildTranslationCacheKey,
  shouldCacheTranslation,
  translateBlockByLines,
  translateTextSmart
} = require('../services/lyrics-translation');
const {
  MIN_LYRICS_CONFIDENCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  LYRICS_APPROVED_CACHE_SOURCE,
  normalizeLyricsText,
  normalizeArtistName,
  buildLyricsLookupCandidates,
  buildLyricsCacheKey,
  buildMusicTrackKey,
  isUsableLyricsCache,
  getCachedLyricsPayload,
  canWriteApprovedLyricsCache,
  parseYouTubeMusicTitle,
  isValidYouTubeId,
  scoreMusicVideoCandidate,
  searchYouTubeMusicCandidates,
  fetchMusicVideoMetadata,
  isSingleTrackVideo,
  getLyricsMatchDetails,
  scoreLyricsMatch,
  isReliableLyricsMatch,
  findReliableLyrics,
  findLyricsWithFallbacks,
  fetchYouTubeOEmbed
} = require('../services/music-catalog');

function registerLyricsRoutes(app, deps = {}) {
  const {
    contentCuration = { list: async () => [] },
    logger = console,
    supabaseGetLyricsCache = async () => null,
    supabaseUpsertLyricsCache = async () => {},
    supabaseGetTranslationCache = async () => null,
    supabaseUpsertTranslationCache = async () => {},
    supabaseGetWorkingMusicVideo = async () => null,
    supabaseGetBadMusicVideos = async () => [],
    supabaseSaveWorkingMusicVideo = async () => {},
    supabaseSaveBadMusicVideo = async () => {},
    YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''
  } = deps;
  // YouTube oEmbed proxy - avoids CORS in browser
  app.get('/api/youtube/oembed', async (req, res) => {
    const url = String(req.query.url || '').trim();

    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    // Basic URL validation
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({ error: 'Must be a YouTube URL' });
    }

    const data = await fetchYouTubeOEmbed(url);

    if (!data || !data.title) {
      return res.status(404).json({ error: 'Could not fetch video metadata' });
    }

    res.json({
      title: data.title,
      author: data.author_name || '',
      thumbnail: data.thumbnail_url || null
    });
  });

  app.get('/api/music/search', async (req, res) => {
    const query = String(req.query.q || '').trim();

    if (!query || normalizeLyricsText(query).length < 2) {
      return res.status(400).json({ success: false, reason: 'Digite o nome da música.' });
    }

    if (!YOUTUBE_API_KEY) {
      return res.status(503).json({
        success: false,
        reason: 'Busca por nome ainda não está configurada. Adicione YOUTUBE_API_KEY no Render.'
      });
    }

    try {
      const initialCandidates = await searchYouTubeMusicCandidates(query, YOUTUBE_API_KEY);
      if (!initialCandidates.length) {
        return res.status(404).json({
          success: false,
          reason: `Não encontrei um vídeo musical confiável para "${query}". Tente música + artista.`
        });
      }

      const firstCandidate = initialCandidates[0];
      const firstParsed = parseYouTubeMusicTitle(firstCandidate.title, firstCandidate.author);
      const trackKey = buildMusicTrackKey(
        firstParsed.trackOriginal || firstCandidate.title,
        firstParsed.artistOriginal || firstCandidate.author
      );
      const knownBadIds = trackKey ? await supabaseGetBadMusicVideos(trackKey) : [];
      const candidatesWithoutKnownBad = initialCandidates.filter((candidate) => !knownBadIds.includes(candidate.videoId));
      const cachedWorkingVideo = trackKey ? await supabaseGetWorkingMusicVideo(trackKey) : null;
      const curated = await contentCuration.list('music', contentKey({ kind: 'music', title: firstParsed.trackOriginal || firstCandidate.title, artist: firstParsed.artistOriginal || firstCandidate.author })).catch(() => []);
      const rejectedIds = new Set(curated.filter(item => item.status === 'rejected').map(item => item.video_id));
      const verifiedIds = new Set(curated.filter(isVerified).map(item => item.video_id));
      const persistedIds = [...new Set([cachedWorkingVideo?.video_id, ...verifiedIds])].filter(id => isValidYouTubeId(id) && !initialCandidates.some(candidate => candidate.videoId === id));
      // Cached/curated IDs need their OWN YouTube metadata, never another video's title/duration.
      const persistedCandidates = persistedIds.length ? await fetchMusicVideoMetadata(persistedIds, YOUTUBE_API_KEY, query).catch(() => []) : [];
      const referenceTrack = firstParsed.trackOriginal || firstCandidate.title;
      const referenceArtist = firstParsed.artistOriginal || firstCandidate.author;
      let expectedDuration = 0;
      try {
        const cachedLyrics = await supabaseGetLyricsCache(buildLyricsCacheKey(referenceTrack, referenceArtist));
        if (isUsableLyricsCache(cachedLyrics, referenceTrack, referenceArtist)) expectedDuration = Number(getCachedLyricsPayload(cachedLyrics)?.duration || 0);
        if (!expectedDuration) {
          const reference = await fetchJsonWithTimeout(`https://lrclib.net/api/get?${new URLSearchParams({ track_name: referenceTrack, artist_name: referenceArtist })}`, 4000);
          if (reference.response.ok && isReliableLyricsMatch(reference.data, referenceTrack, referenceArtist)) expectedDuration = Number(reference.data.duration || 0);
        }
      } catch { /* Duration unavailable: still reject explicit compilations and verify video metadata. */ }
      let candidates = [...candidatesWithoutKnownBad, ...persistedCandidates]
        .filter(item => !knownBadIds.includes(item.videoId) && !rejectedIds.has(item.videoId) && isSingleTrackVideo(item, query, expectedDuration))
        .map(item => ({ ...item, cached: item.videoId === cachedWorkingVideo?.video_id, verified: verifiedIds.has(item.videoId) }))
        .sort((a, b) => Number(b.verified) - Number(a.verified) || b.score - a.score);
      if (!candidates.length) {
        candidates = (await searchYouTubeMusicCandidates(`${query} official audio`, YOUTUBE_API_KEY, knownBadIds))
          .filter(item => !rejectedIds.has(item.videoId) && isSingleTrackVideo(item, query, expectedDuration));
      }
      const video = candidates[0];

      if (!video) {
        return res.status(404).json({
          success: false,
          reason: `Os vídeos encontrados para "${query}" já falharam no player. Tente música + artista ou outra versão.`
        });
      }

      const parsed = parseYouTubeMusicTitle(video.title, video.author);
      const track = parsed.trackOriginal || video.title;
      const artist = parsed.artistOriginal || video.author || 'YouTube';
      return res.json({
        success: true,
        videoId: video.videoId,
        title: track,
        artist,
        videoTitle: video.title,
        channelName: video.author,
        thumbnail: video.thumbnail,
        durationSeconds: video.durationSeconds,
        score: video.score,
        trackKey,
        candidates: candidates.map((candidate) => ({
          videoId: candidate.videoId,
          title: candidate.title,
          channelName: candidate.author,
          thumbnail: candidate.thumbnail,
          durationSeconds: candidate.durationSeconds,
          score: candidate.score,
          cached: Boolean(candidate.cached),
          verified: Boolean(candidate.verified)
        })),
        lyricsFound: false
      });
    } catch (error) {
      logger.warn?.('Music search failed', { error });
      return res.status(502).json({
        success: false,
        reason: 'Falha ao pesquisar música no YouTube agora.'
      });
    }
  });

  app.post('/api/music/video-status', async (req, res) => {
    const body = req.body || {};
    const track = String(body.track || '').trim();
    const artist = String(body.artist || '').trim();
    const videoId = String(body.videoId || '').trim();
    const status = String(body.status || '').trim();
    const reason = String(body.reason || '').trim() || 'embed_failed';
    const trackKey = String(body.trackKey || buildMusicTrackKey(track, artist)).trim();

    if (!trackKey || !isValidYouTubeId(videoId)) {
      return res.status(400).json({ success: false, reason: 'Dados do vídeo incompletos.' });
    }

    try {
      if (status === 'working') {
        const result = await supabaseSaveWorkingMusicVideo(trackKey, { track, artist, videoId });
        if (result?.error) return res.status(202).json({ success: false, reason: result.error });
        return res.json({ success: true });
      }

      const result = await supabaseSaveBadMusicVideo(trackKey, videoId, reason);
      if (result?.error) return res.status(202).json({ success: false, reason: result.error });
      return res.json({ success: true });
    } catch (error) {
      logger.warn?.('Music video status write failed', { error });
      return res.status(202).json({ success: false, reason: 'Status não salvo.' });
    }
  });

  app.get('/api/lyrics/lrclib/get', async (req, res) => {
    const artistName = String(req.query.artist_name || '').trim();
    const trackName = String(req.query.track_name || '').trim();

    if (!trackName) {
      return res.status(400).json({ error: 'track_name obrigatorio' });
    }

    try {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
      const { response, data } = await fetchJsonWithTimeout(url);
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(502).json({ error: 'Falha ao consultar LRCLIB', detail: error.message });
    }
  });

  app.get('/api/lyrics/lrclib/search', async (req, res) => {
    const artistName = String(req.query.artist_name || '').trim();
    const trackName = String(req.query.track_name || '').trim();

    if (!trackName) {
      return res.status(400).json({ error: 'track_name obrigatorio' });
    }

    try {
      const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
      const { response, data } = await fetchJsonWithTimeout(url);
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(502).json({ error: 'Falha ao pesquisar LRCLIB', detail: error.message });
    }
  });

  app.get('/api/lyrics/find', async (req, res) => {
    const trackName = String(req.query.track_name || '').trim();
    const artistName = String(req.query.artist_name || '').trim();
    const videoTitle = String(req.query.video_title || '').trim();
    const channelName = String(req.query.channel_name || '').trim();

    const parsed = videoTitle
      ? parseYouTubeMusicTitle(videoTitle, channelName)
      : {
          trackOriginal: trackName,
          artistOriginal: artistName,
          track: normalizeLyricsText(trackName),
          artist: normalizeArtistName(artistName)
        };

    const finalTrack = parsed.trackOriginal || trackName;
    const finalArtist = parsed.artistOriginal || artistName;

    if (!finalTrack || normalizeLyricsText(finalTrack).length < 2) {
      return res.status(400).json({
        success: false,
        reason: 'não consegui identificar o nome da música'
      });
    }

    if (!finalArtist || normalizeArtistName(finalArtist).length < 2) {
      return res.status(422).json({
        success: false,
        reason: 'não consegui identificar artista e música com confiança',
        track: finalTrack,
        artist: finalArtist || ''
      });
    }

    try {
      const cacheKey = buildLyricsCacheKey(finalTrack, finalArtist);
      const cached = await supabaseGetLyricsCache(cacheKey);
      if (isUsableLyricsCache(cached, finalTrack, finalArtist)) {
        const payload = getCachedLyricsPayload(cached);
        return res.json({
          success: true,
          ...payload,
          searchedTrack: finalTrack,
          searchedArtist: finalArtist,
          mode: payload?.synced ? 'synced' : 'plain'
        });
      }

      const lyrics = await findLyricsWithFallbacks(finalTrack, finalArtist);
      if (!lyrics) {
        logger.info?.('Lyrics not found after strict match', {
          trackLength: normalizeLyricsText(finalTrack).length,
          artistLength: normalizeArtistName(finalArtist).length
        });
        return res.status(404).json({
          success: false,
          reason: `Não encontramos letra para "${finalTrack}" de ${finalArtist}. Tente a versão oficial, música + artista, ou outra gravação sem remix/live.`,
          track: finalTrack,
          artist: finalArtist
        });
      }

      await supabaseUpsertLyricsCache(cacheKey, {
        track: finalTrack,
        artist: finalArtist,
        lyrics,
        source: LYRICS_PROVIDER_CACHE_SOURCE,
        confidence: lyrics.confidence
      });

      return res.json({
        success: true,
        ...lyrics,
        cached: false,
        searchedTrack: finalTrack,
        searchedArtist: finalArtist,
        fallbackSource: lyrics.fallbackSource || 'lrclib',
        mode: lyrics.synced ? 'synced' : 'plain'
      });
    } catch (error) {
      logger.warn?.('Lyrics provider failed', { error });
      return res.status(502).json({
        success: false,
        reason: 'falha ao consultar provedor de letras',
        detail: error.message
      });
    }
  });

  app.post('/api/lyrics/approved', async (req, res) => {
    if (!canWriteApprovedLyricsCache(req)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const body = req.body || {};
    const track = String(body.track || body.trackName || '').trim();
    const artist = String(body.artist || body.artistName || '').trim();
    const plainLyrics = String(body.plainLyrics || '').trim();
    const syncedLyrics = body.syncedLyrics ? String(body.syncedLyrics) : null;

    if (!track) return res.status(400).json({ error: 'track obrigatorio' });
    if (!artist) return res.status(400).json({ error: 'artist obrigatorio' });
    if (!plainLyrics && !syncedLyrics) return res.status(400).json({ error: 'plainLyrics ou syncedLyrics obrigatorio' });

    try {
      const cacheKey = buildLyricsCacheKey(track, artist);
      const lyrics = {
        source: 'APPROVED',
        synced: Boolean(syncedLyrics),
        syncedLyrics,
        plainLyrics: plainLyrics || null,
        duration: body.duration || null,
        trackName: track,
        artistName: artist,
        confidence: 999,
        match: {
          trackOverlap: 1,
          artistOverlap: 1,
          exactTrack: true,
          exactArtist: true
        }
      };

      await supabaseUpsertLyricsCache(cacheKey, {
        track,
        artist,
        lyrics,
        source: LYRICS_APPROVED_CACHE_SOURCE,
        confidence: 999
      });

      return res.json({
        success: true,
        cacheKey,
        source: LYRICS_APPROVED_CACHE_SOURCE
      });
    } catch (_error) {
      return res.status(500).json({ error: 'Erro ao salvar letra aprovada' });
    }
  });

  async function handleTranslateRequest(req, res) {
    const source = req.method === 'POST' ? req.body || {} : req.query || {};
    const text = String(source.q || source.text || '').trim();
    const from = String(source.from || 'en').trim();
    const to = String(source.to || 'pt-BR').trim();

    if (!text || text.length > 12000) {
      return res.status(400).json({ error: 'Texto obrigatorio com ate 12000 caracteres' });
    }

    try {
      const cacheKey = buildTranslationCacheKey(text, from, to);
      const cached = await supabaseGetTranslationCache(cacheKey);
      if (cached?.translated_text && hasMatchingTranslationBlockShape(text, cached.translated_text)) {
        return res.json(asTranslationResponse(cached.translated_text, cached.provider || 'translation-cache'));
      }

      let result = await withTranslationSlot(() => translateTextSmart(text, from, to, process.env, logger));
      if (result && !hasMatchingTranslationBlockShape(text, result.translated)) {
        logger.warn?.('Translation block shape mismatch after provider', {
          provider: result.provider,
          expectedLines: splitTranslationBlock(text).length,
          receivedLines: splitTranslationBlock(result.translated).length
        });
        result = null;
      }
      if (!result && hasTranslationBlock(text)) {
        const translatedBlock = await withTranslationSlot(() => translateBlockByLines(text, from, to, process.env, logger));
        if (translatedBlock) {
          result = {
            provider: 'line-fallback',
            translated: translatedBlock
          };
        }
      }
      if (!result) {
        logger.warn?.('Translation failed after all providers', {
          textLength: text.length,
          from,
          to,
          isBlock: hasTranslationBlock(text)
        });
        return res.status(502).json({
          responseStatus: 502,
          error: 'Falha ao traduzir texto'
        });
      }

      if (shouldCacheTranslation(result.translated)) {
        await supabaseUpsertTranslationCache(cacheKey, {
          fromLang: from,
          toLang: to,
          originalText: text,
          translatedText: result.translated,
          provider: result.provider
        });
      }

      return res.json(asTranslationResponse(result.translated, result.provider));
    } catch (error) {
      logger.warn?.('Translation route crashed', {
        message: error.message,
        textLength: text.length,
        from,
        to
      });
      return res.status(502).json({
        responseStatus: 502,
        error: 'Falha ao traduzir texto',
        detail: error.message
      });
    }
  }

  app.get('/api/translate', handleTranslateRequest);
  app.post('/api/translate', handleTranslateRequest);

  app.get('/api/translate/diagnostics', async (_req, res) => {
    const sample = 'Hello world';
    const geminiConfigured = Boolean(String(process.env.GEMINI_API_KEY || '').trim());
    const geminiModel = String(process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
    const diagnostics = {
      success: false,
      geminiConfigured,
      geminiModel,
      geminiDisabledForLyrics: true,
      modelCandidates: [],
      deeplConfigured: Boolean(String(process.env.DEEPL_API_KEY || '').trim()),
      sample,
      gemini: {
        ok: false,
        translated: '',
        error: 'Gemini desativado para tradução de letras.',
        attempts: []
      },
      providerChain: {
        ok: false,
        provider: '',
        translated: '',
        error: ''
      }
    };

    try {
      const chainResult = await translateTextSmart(sample, 'en', 'pt-BR', process.env, logger);
      diagnostics.providerChain.ok = Boolean(chainResult?.translated);
      diagnostics.providerChain.provider = chainResult?.provider || '';
      diagnostics.providerChain.translated = chainResult?.translated || '';
    } catch (error) {
      diagnostics.providerChain.error = error.message;
    }

    diagnostics.success = diagnostics.providerChain.ok;
    return res.status(diagnostics.success ? 200 : 502).json(diagnostics);
  });
}

module.exports = {
  registerLyricsRoutes,
  findReliableLyrics,
  LYRICS_APPROVED_CACHE_SOURCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  buildLyricsCacheKey,
  buildLyricsLookupCandidates,
  canWriteApprovedLyricsCache,
  isUsableLyricsCache,
  normalizeLyricsText,
  parseYouTubeMusicTitle,
  buildMusicTrackKey,
  scoreMusicVideoCandidate,
  isSingleTrackVideo,
  searchYouTubeMusicCandidates,
  getLyricsMatchDetails,
  MIN_LYRICS_CONFIDENCE,
  scoreLyricsMatch,
  isReliableLyricsMatch
};
