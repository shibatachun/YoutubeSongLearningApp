import { promises as fs } from 'fs';
import path from 'path';

export interface Cue { start: number; end: number; text: string }
export interface TimedText { lang: string; name?: string }
export interface Video {
  id: string;
  title?: string;
  thumb?: string;
  channel?: string;
  vttUrl?: string;
  cues?: Cue[];
  timedtext?: TimedText;
}

interface DBShape { videos: Video[] }

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE  = path.join(DATA_DIR, 'videos.json');

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DB_FILE); }
  catch { await fs.writeFile(DB_FILE, JSON.stringify({ videos: [] } as DBShape, null, 2)); }
}

export async function loadDB(): Promise<DBShape> {
  await ensureFile();
  const raw = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(raw || '{"videos":[]}');
}

export async function saveDB(db: DBShape) {
  await ensureFile();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function listVideos() {
  const db = await loadDB();
  return db.videos;
}

export async function getVideo(id: string) {
  const db = await loadDB();
  return db.videos.find(v => v.id === id) || null;
}

export async function upsertVideo(v: Partial<Video> & { id: string }) {
  const db = await loadDB();
  const i = db.videos.findIndex(x => x.id === v.id);
  if (i >= 0) db.videos[i] = { ...db.videos[i], ...v };
  else db.videos.push({ ...v });
  await saveDB(db);
  return (await getVideo(v.id))!;
}

export async function deleteVideo(id: string) {
  const db = await loadDB();
  const before = db.videos.length;
  db.videos = db.videos.filter(v => v.id !== id);
  await saveDB(db);
  return db.videos.length < before;
}