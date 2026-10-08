import express from 'express';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const logFile = join(dataDir, 'events.ndjson');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '1mb', type: ['application/json', 'text/plain'] }));

app.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'body must be a JSON object';
  if (!Array.isArray(body.events)) return 'events must be an array';
  if (body.events.length > 1000) return 'too many events in one batch';
  if (typeof body.sessionId !== 'string') return 'sessionId is required';
  return null;
}

app.post('/api/trackwise', async (req, res) => {
  const error = validatePayload(req.body);
  if (error) return res.status(400).json({ error });

  const { sdk, version, sessionId, visitorId, count, dropped, events } = req.body;
  const lines = events.map((event) =>
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      sdk,
      version,
      sessionId,
      visitorId,
      batchCount: count,
      batchDropped: dropped,
      event
    })
  );

  try {
    await mkdir(dataDir, { recursive: true });
    await appendFile(logFile, lines.join('\n') + '\n', 'utf8');
  } catch (err) {
    console.error('failed to persist events:', err.message);
  }

  console.log(
    `[trackwise] session=${sessionId} events=${events.length} ` +
      `types=${[...new Set(events.map((e) => e.type))].join(',')}`
  );

  res.status(202).json({ ok: true, received: events.length });
});

app.get('/api/trackwise/summary', async (req, res) => {
  try {
    const raw = await readFile(logFile, 'utf8');
    const records = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const byType = {};
    const sessions = new Set();
    for (const record of records) {
      byType[record.event.type] = (byType[record.event.type] || 0) + 1;
      sessions.add(record.sessionId);
    }

    res.json({ total: records.length, sessions: sessions.size, byType });
  } catch {
    res.json({ total: 0, sessions: 0, byType: {} });
  }
});

app.get('/', (req, res) => {
  res.type('text/plain').send(
    'trackwise.js receiver is running.\n' +
      'POST events to /api/trackwise\n' +
      'GET  summary from /api/trackwise/summary\n'
  );
});

app.listen(port, () => {
  console.log(`trackwise receiver listening on http://localhost:${port}`);
  console.log(`events appended to ${logFile}`);
});
