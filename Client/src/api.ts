const BASE = import.meta.env.VITE_API_URL || ''; // 直连后端或走代理

const j = (r: Response) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); };

export type Cue = { start:number; end:number; text:string };
export type Video = { id:string; title?:string; thumb?:string; cues?:Cue[]; channel?:string };

export const api = {
  list: () => fetch(`${BASE}/api/videos`).then(j),
  get: (id: string) => fetch(`${BASE}/api/videos/${id}`).then(j),
  create: (v: {id:string; title?:string}) =>
    fetch(`${BASE}/api/videos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(v) }).then(j),
  uploadVtt: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`${BASE}/api/videos/${id}/cues`, { method:'POST', body: fd }).then(j);
  },
  yt: {
    async tracks(videoId: string): Promise<Array<{languageCode: string; kind?: 'asr'; label: string; translatable: boolean;}>> {
      const r = await fetch(`/api/youtube/captions?videoId=${encodeURIComponent(videoId)}`);
      if (!r.ok) throw new Error('list captions failed'); return r.json();
    },
    async saveCues(id: string, payload: { videoId: string; lang: string; kind?: 'asr'; tlang?: string; offsetMs?: number; }) {
      const r = await fetch(`/api/videos/${id}/cues/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return r.json(); // { ok, video, count }
    },
  },
};