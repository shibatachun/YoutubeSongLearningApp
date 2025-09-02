// src/routes/youtube.ts
import { Router } from 'express';
import ytdl from 'ytdl-core';

export const youtubeRouter = Router();

/**
 * GET /api/youtube/tracks?v=<videoId>
 * 返回可用字幕轨（语言、是否自动字幕、是否支持翻译等）
 */
youtubeRouter.get('/tracks', async (req, res) => {
  const v = String(req.query.v || '');
  if (!v) return res.status(400).json({ ok: false, msg: 'missing v' });

  try {
    const info = await ytdl.getInfo(v);
    const list =
      (info.player_response as any)?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks ?? [];
    res.json({ ok: true, tracks: list });
  } catch (e: any) {
    res.status(500).json({ ok: false, msg: e?.message || 'getInfo failed' });
  }
});

/**
 * GET /api/youtube/vtt?v=<videoId>&lang=<xx>&kind=asr?&tlang=zh-Hans?
 * 直接返回某条 VTT 文本（可选机器翻译）
 */
youtubeRouter.get('/vtt', async (req, res) => {
  const v = String(req.query.v || '');
  const lang = String(req.query.lang || '');
  const kind = String(req.query.kind || ''); // 'asr' 表示自动字幕
  const tlang = req.query.tlang ? String(req.query.tlang) : undefined;

  if (!v || !lang) {
    return res.status(400).json({ ok: false, msg: 'v & lang required' });
  }

  try {
    const info = await ytdl.getInfo(v);
    const list =
      (info.player_response as any)?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks ?? [];

    // 选轨：优先精确语言 &&（如需要）自动字幕；其次前缀匹配
    let track =
      list.find(
        (t: any) =>
          t.languageCode === lang && (kind === 'asr' ? t.kind === 'asr' : true),
      ) ||
      list.find((t: any) => t.languageCode.startsWith(lang));

    if (!track) return res.status(404).json({ ok: false, msg: 'no captions' });

    // 机器翻译（需要该轨 translatable=true 才有效）
    let url = track.baseUrl;
    if (tlang) {
      const u = new URL(url);
      u.searchParams.set('tlang', tlang);
      url = u.toString();
    }

    const resp = await fetch(url); // Node 18+ 自带 fetch
    if (!resp.ok) throw new Error(`fetch vtt failed: ${resp.status}`);
    const vtt = await resp.text();

    res.type('text/vtt').send(vtt);
  } catch (e: any) {
    res.status(500).json({ ok: false, msg: e?.message || 'error' });
  }
});