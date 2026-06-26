import type { VercelRequest, VercelResponse } from '@vercel/node';

// Invidious instances to try in order
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
  if (!path || (!path.startsWith('/api/v1/') && !path.startsWith('/api/v1'))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  // Security: only allow known Invidious API paths
  const allowed = ['/api/v1/videos/', '/api/v1/search', '/api/v1/channels/'];
  if (!allowed.some(a => path.startsWith(a))) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  // Forward any query params beyond 'path'
  const extraParams = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const suffix = extraParams ? (path.includes('?') ? '&' : '?') + extraParams : '';

  for (const instance of INSTANCES) {
    try {
      const url = `${instance}${path}${suffix}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (response.ok) {
        const data = await response.json();
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(data);
      }
    } catch {
      // Try next instance
    }
  }

  return res.status(502).json({ error: 'All Invidious instances failed' });
}
