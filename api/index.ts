// Vercel serverless entry — optional /api/parse fallback (primary pipeline is in-browser).
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { extractPo } from '../src/services/extractor';
import type { PoLine } from '../shared/types';

const app = express();
app.use(express.json({ limit: '6mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'jpe-quotation-studio', runtime: 'vercel', ts: new Date().toISOString() });
});

app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Send it as multipart/form-data with field "file".' });
      return;
    }
    const { text, numpages } = await pdfParse(req.file.buffer);
    const raw = text.replace(/\r/g, '').split('\n').map((t) => t.trim()).filter(Boolean);
    const count = Math.max(1, numpages ?? 1);
    const perPage = Math.max(1, Math.ceil(raw.length / count));
    const pages: PoLine[][] = [];
    for (let i = 0; i < raw.length; i += perPage) {
      pages.push(raw.slice(i, i + perPage).map((t, j) => ({ x: j * 12, y: j * 12, w: t.length * 5, h: 12, page: 1, text: t })));
    }
    const result = extractPo(pages);
    res.json({ method: 'server-pdf-parse', pages: pages.length, result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default app;
