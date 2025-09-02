import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { listVideos, getVideo, upsertVideo, deleteVideo } from './db';
import { parseWebVTT } from './vtt';
import { youtubeRouter } from './routes/youtube';

const app = express();
const PORT = Number(process.env.PORT || 5173);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// —— API ——

// 健康检查
app.get('/api/health', (_req, res) => res.json({ ok: true, msg: 'server is up' }));

// 列表
app.get('/api/videos', async (_req, res) => {
  res.json(await listVideos());
});

// 详情
app.get('/api/videos/:id', async (req, res) => {
  const v = await getVideo(req.params.id);
  if (!v) return res.status(404).json({ ok: false, msg: 'not found' });
  res.json(v);
});

// 新建（只需要 id）
app.post('/api/videos', async (req, res) => {
  const { id, title, thumb } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, msg: 'id required' });
  const v = await upsertVideo({ id, title, thumb });
  res.json(v);
});

// 更新（合并）
app.put('/api/videos/:id', async (req, res) => {
  const id = req.params.id;
  const v = await upsertVideo({ id, ...req.body });
  res.json(v);
});

// 删除
app.delete('/api/videos/:id', async (req, res) => {
  const ok = await deleteVideo(req.params.id);
  res.json({ ok });
});

// 本地上传 .vtt 并解析为 cues
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/videos/:id/cues', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, msg: 'no file' });
  const text = req.file.buffer.toString('utf8');
  try {
    const cues = parseWebVTT(text);
    const v = await upsertVideo({ id: req.params.id, cues });
    res.json(v);
  } catch (e: any) {
    res.status(400).json({ ok: false, msg: e?.message || 'parse error' });
  }
});
app.use('/api/youtube', youtubeRouter);

// ⬇️ 新增 ②：一键“从 YouTube 拉取 VTT → 解析 → 保存到当前视频”
/**
 * POST /api/videos/:id/cues/youtube
 * body: { videoId: string, lang: string, kind?: 'asr', tlang?: string, offsetMs?: number }
 * 说明：
 *  - kind='asr' 拉自动字幕；不传则优先人工字幕
 *  - tlang=目标机器翻译语言（如 'zh-Hans'），仅当该轨 translatable=true 时有效
 *  - offsetMs 整体时间偏移（毫秒，正负皆可）
 */
import { fetchVtt } from './services/youtubeCaptions';
app.post('/api/videos/:id/cues/youtube', async (req, res) => {
  const { videoId, lang, kind, tlang, offsetMs } = req.body || {};
  if (!videoId || !lang) {
    return res.status(400).json({ ok: false, msg: 'videoId & lang required' });
  }
  try {
    const vtt = await fetchVtt(videoId, String(lang), {
      kind: kind === 'asr' ? 'asr' : undefined,
      tlang: tlang ? String(tlang) : undefined,
      offsetMs: Number(offsetMs) || 0,
    });
    const cues = parseWebVTT(vtt);
    const v = await upsertVideo({ id: req.params.id, cues });
    res.json({ ok: true, video: v, count: cues.length });
  } catch (e: any) {
    res.status(400).json({ ok: false, msg: e?.message || 'fetch/parse failed' });
  }
});

app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));