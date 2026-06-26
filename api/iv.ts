import type { VercelRequest, VercelResponse } from '@vercel/node';

const INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.jing.rocks',
  'https://iv.datura.network',
  'https://invidious.io.lol',
  'https://yt.omada.cafe',
  'https://invidious.nikkosphere.com',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path as string;
  if (!path || !path.startsWith('/api/v1/')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const allowed = ['/api/v1/videos/', '/api/v1/search', '/api/v1/channels/'];
  if (!allowed.some(a => path.startsWith(a))) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  const extraParams = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const suffix = extraParams ? (path.includes('?') ? '&' : '?') + extraParams : '';

  // Race all instances in parallel — first valid response wins
  try {
    const data = await Promise.any(
      INSTANCES.map(instance =>
        fetch(`${instance}${path}${suffix}`, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }).then(r => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.json();
        })
      )
    );

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'All Invidious instances failed' });
  }
}
