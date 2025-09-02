import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './VideoPage.css';
import { useStoredNumber } from "../lib/useStoredNumber";
import { api } from '../api';
import type { Cue, Video } from '../api';
import { useYouTubePlayer } from '../lib/useYoutube';

const fmt = (t:number) => {
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = Math.floor(t%60);
  return (h?`${h}:`:'') + `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

type TrackItem = { languageCode: string; kind?: 'asr'; label: string; translatable: boolean };

export default function VideoPage(){
  const { id = '' } = useParams();
  const nav = useNavigate();

  const [v, setV] = useState<Video | null>(null);
  const [all, setAll] = useState<Video[]>([]);        // 右侧列表
  const [active, setActive] = useState<number>(-1);
  const [q, setQ] = useState('');

  // ⬇️ 显示偏移（秒），持久化：正数=提前显示
  const [offset, setOffset] = useStoredNumber(`v:${id}:subOffset`, 0);

  // ⬇️ YouTube 字幕轨道 & 拉取配置
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [lang, setLang] = useState<string>('');
  const [asr, setAsr] = useState<boolean>(false);
  const [tlang, setTlang] = useState<string>('');     // 例如 zh-Hans
  const [saveOffset, setSaveOffset] = useState<number>(0); // 保存到服务端时的偏移（秒）
  const [saving, setSaving] = useState(false);

  const { player, ready } = useYouTubePlayer('yt-player', id);

  // 用“原始索引”存 ref，避免过滤后错位
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const setRef = (idx: number) => (el: HTMLDivElement | null) => { itemRefs.current[idx] = el; };

  useEffect(() => { api.get(id).then(setV); }, [id]);
  useEffect(() => { api.list().then(setAll); }, []);

  // ⬇️ 拉取可用字幕轨（随视频切换）
  useEffect(() => {
    if (!id) return;
    api.yt.tracks(id)
      .then(list => {
        setTracks(list);
        // 默认选择：优先非 asr，其次第一项
        const pref = list.find(x => !x.kind) ?? list[0];
        setLang(pref?.languageCode || '');
        setAsr(!!pref?.kind);
      })
      .catch(() => setTracks([]));
  }, [id]);

  // 跟随播放高亮（按“显示偏移”对齐）
  useEffect(() => {
    if (!ready || !v?.cues?.length) return;
    let raf = 0;
    const loop = () => {
      const t0 = player.current?.getCurrentTime?.() ?? 0;
      const shown = Math.max(0, t0 + offset);                 // ⬅️ 关键：显示时间 = 当前 + 偏移
      const i = v!.cues!.findIndex(c => shown >= c.start && shown < c.end);
      setActive(i);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, v?.cues, player, offset]);

  // 高亮滚动定位（使用原始索引）
  useEffect(() => {
    if (active < 0) return;
    const el = itemRefs.current[active];
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const updated = await api.uploadVtt(id, f);
    setV(updated);
    e.target.value = '';
  };

  const onSeek = (c: Cue) => {
    const t = Math.max(0, c.start - offset);           // ⬅️ 点击跳到“起点-显示偏移”
    player.current?.seekTo?.(t, true);
    player.current?.playVideo?.();
  };

  const cues = v?.cues ?? [];

  // 过滤：保留原始索引
  const pairs = useMemo(() => cues.map((c, idx) => ({ c, idx })), [cues]);
  const filtered = useMemo(() => {
    if (!q.trim()) return pairs;
    const kw = q.toLowerCase();
    return pairs.filter(p => p.c.text.toLowerCase().includes(kw));
  }, [q, pairs]);

  const others = useMemo(() => all.filter(x => x.id !== id), [all, id]);

  // 一键：从 YouTube 拉取并保存字幕
  const onSaveFromYT = async () => {
    if (!id || !lang) return;
    try {
      setSaving(true);
      const payload = {
        videoId: id,
        lang,
        kind: asr ? 'asr' as const : undefined,
        tlang: tlang || undefined,
        offsetMs: Math.round((saveOffset || 0) * 1000),  // ⬅️ 服务器端偏移（秒→毫秒）
      };
      const res = await api.yt.saveCues(id, payload);
      if (res?.video) setV(res.video);
    } catch (e) {
      // 简单提示即可
      alert('拉取/保存字幕失败');
    } finally {
      setSaving(false);
    }
  };

  // ⬇️（可选）快捷键调整“显示偏移”： [ -0.1, ] +0.1, \ 归零
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '[') setOffset(v => +(v - 0.1).toFixed(2));
      if (e.key === ']') setOffset(v => +(v + 0.1).toFixed(2));
      if (e.key === '\\') setOffset(0);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setOffset]);

  return (
    <div className="vp-container">
      {/* 左列：播放器 + 字幕面板 */}
      <div className="vp-main">
        <div className="vp-card">
          <div className="vp-player">
            <div id="yt-player" />
          </div>
        </div>

        <div className="vp-card vp-panel">
          <div className="vp-panel__top" style={{flexWrap:'wrap', gap: 8}}>
            <div className="vp-title">字幕（{cues.length}）</div>

            {/* 搜索 */}
            <div className="vp-search" title="搜索字幕">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索字幕…" />
            </div>

            {/* 本地上传 VTT */}
            <label className="vp-btn vp-btn--brand" title="上传 VTT（本地）">
              上传 VTT
              <input type="file" accept=".vtt" onChange={onUpload}/>
            </label>

            {/* 显示偏移（仅影响前端显示/跳转） */}
            <div className="vp-offset">
              <button onClick={()=>setOffset(v=>+(v-0.5).toFixed(2))}>-0.5s</button>
              <button onClick={()=>setOffset(v=>+(v-0.1).toFixed(2))}>-0.1s</button>
              <input
                type="number" step="0.1" value={offset}
                onChange={e=>setOffset(Number(e.target.value)||0)}
                style={{width:80}}
                title="显示偏移（秒）· 正数=提前，负数=延迟 · 快捷键：[ / ] / \"
              />
              <button onClick={()=>setOffset(v=>+(v+0.1).toFixed(2))}>+0.1s</button>
              <button onClick={()=>setOffset(v=>+(v+0.5).toFixed(2))}>+0.5s</button>
              <button onClick={()=>setOffset(0)}>重置</button>
            </div>
          </div>

          {/* 来自 YouTube 的字幕拉取（保存到当前视频） */}
          <div className="vp-subtool" style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', margin:'4px 0 8px'}}>
            <span className="vp-side-sub" style={{opacity:.8}}>从 YouTube 拉取：</span>
            <select value={`${lang}|${asr?'asr':''}`} onChange={(e)=>{
              const [lng, kind] = e.target.value.split('|');
              setLang(lng); setAsr(kind==='asr');
            }}>
              {tracks.map(t => (
                <option key={`${t.languageCode}-${t.kind||'man'}`} value={`${t.languageCode}|${t.kind||''}`}>
                  {t.label} ({t.languageCode}{t.kind==='asr' ? ', auto' : ''})
                </option>
              ))}
            </select>
            <input
              placeholder="tlang（可选，如 zh-Hans）"
              value={tlang} onChange={e=>setTlang(e.target.value)}
              style={{width:160}}
            />
            <input
              type="number" step="0.1"
              placeholder="保存时偏移（秒）"
              value={saveOffset}
              onChange={e=>setSaveOffset(Number(e.target.value)||0)}
              style={{width:140}}
              title="在服务端对 VTT 时间戳做整体偏移后再保存"
            />
            <button className="vp-btn" onClick={onSaveFromYT} disabled={!lang || saving}>
              {saving ? '保存中…' : '拉取并保存字幕'}
            </button>
          </div>

          <div className="vp-list">
            {filtered.length === 0 && (
              <p style={{padding:'12px 8px', color:'var(--muted)'}}>暂无字幕或没有匹配结果。</p>
            )}
            {filtered.map(({c, idx}) => {
              const isActive = idx === active; // ⬅️ 用原始索引判定
              return (
                <div
                  ref={setRef(idx)}
                  key={`${c.start}-${idx}`}
                  className={`vp-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSeek(c)}
                >
                  <span className="vp-time">{fmt(c.start)}–{fmt(c.end)}</span>
                  <div className="vp-text">{c.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右列：视频列表（像 up next） */}
      <aside className="vp-card vp-sidebar vp-sticky">
        <div className="vp-title" style={{padding:'6px 6px 10px'}}>视频列表（{others.length + (id ? 1 : 0)}）</div>
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {others.map(vv => (
            <div
              key={vv.id}
              className="vp-side-item"
              onClick={() => nav(`/v/${vv.id}`)}
              title={vv.title || vv.id}
            >
              <img className="vp-side-thumb" src={thumb(vv.id)} alt={vv.title || vv.id} loading="lazy" />
              <div>
                <div className="vp-side-title">{vv.title || vv.id}</div>
                {vv.channel && <div className="vp-side-sub">{vv.channel}</div>}
              </div>
            </div>
          ))}
          {others.length === 0 && (
            <div className="vp-side-sub" style={{padding:'8px 6px'}}>
              暂无其它视频，可在首页添加更多～
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}