import ytdl from 'ytdl-core';

type FetchOpts = {
  kind?: 'asr';       // 自动字幕
  tlang?: string;     // 机器翻译目标语言，如 'zh-Hans'
  offsetMs?: number;  // 整体偏移（毫秒），可正可负
};

/** 拉取某视频某语言的 VTT（可选 asr / 机器翻译 / 时间偏移） */
export async function fetchVtt(
  videoId: string,
  lang: string,
  opts: FetchOpts = {},
): Promise<string> {
  const info = await ytdl.getInfo(videoId);
  const list =
    (info.player_response as any)?.captions?.playerCaptionsTracklistRenderer
      ?.captionTracks ?? [];

  let track =
    list.find(
      (t: any) =>
        t.languageCode === lang && (opts.kind === 'asr' ? t.kind === 'asr' : true),
    ) || list.find((t: any) => t.languageCode.startsWith(lang));

  if (!track) throw new Error('no captions for given lang');

  let url = track.baseUrl;
  if (opts.tlang) {
    const u = new URL(url);
    u.searchParams.set('tlang', opts.tlang);
    url = u.toString();
  }

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch vtt failed: ${resp.status}`);
  let vtt = await resp.text();

  if (opts.offsetMs && opts.offsetMs !== 0) {
    vtt = shiftVtt(vtt, opts.offsetMs);
  }
  return vtt;
}

/** 把 VTT 里的所有时间戳整体偏移 offsetMs 毫秒 */
function shiftVtt(vtt: string, offsetMs: number): string {
  return vtt.replace(
    /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/g,
    (_, a, b) => `${fmt(add(a, offsetMs))} --> ${fmt(add(b, offsetMs))}`,
  );
}

function add(ts: string, off: number): number {
  const m = ts.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)!;
  const total =
    (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000 +
    Number(m[4]) +
    off;
  return Math.max(0, total); // 不要出现负时间
}

function fmt(ms: number): string {
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const ms3 = ms % 1000;
  return (
    String(hh).padStart(2, '0') +
    ':' +
    String(mm).padStart(2, '0') +
    ':' +
    String(ss).padStart(2, '0') +
    '.' +
    String(ms3).padStart(3, '0')
  );
}