import type { Cue } from './db';

function toSec(t: string) {
  // hh:mm:ss.mmm 或 mm:ss.mmm
  const [hms, ms = '0'] = t.split('.');
  const parts = hms.split(':').map(Number);
  let s = 0;
  if (parts.length === 3) s = parts[0]*3600 + parts[1]*60 + parts[2];
  else if (parts.length === 2) s = parts[0]*60 + parts[1];
  return s + Number(`0.${ms}`);
}

export function parseWebVTT(text: string): Cue[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const cues: Cue[] = [];
  let i = 0;
  // 跳过头部 "WEBVTT" 和空行/NOTE
  while (i < lines.length && (lines[i].trim()==='' || /^WEBVTT/i.test(lines[i]) || /^NOTE\b/.test(lines[i]))) i++;
  while (i < lines.length) {
    // 可选编号
    if (lines[i] && !lines[i].includes('-->') && !/^\s*$/.test(lines[i])) i++;
    if (i >= lines.length) break;
    const m = lines[i].match(/(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})/);
    if (!m) { i++; continue; }
    const start = toSec(m[1]), end = toSec(m[2]);
    i++;
    const texts: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      texts.push(lines[i].replace(/<\/?[^>]+>/g, '')); // 去掉简单标签
      i++;
    }
    cues.push({ start, end, text: texts.join('\n') });
    while (i < lines.length && lines[i].trim()==='') i++;
  }
  return cues;
}