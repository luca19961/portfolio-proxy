// api/yahoo.js  — Vercel Serverless Function
// Deploy su Vercel: collega il repo GitHub e funziona subito gratis.
// URL finale: https://TUO-PROGETTO.vercel.app/api/yahoo?url=...

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Validazione parametro url ───────────────────────────────────────────────
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Parametro url mancante' });
  }

  // ── Whitelist: solo Yahoo Finance è permesso ────────────────────────────────
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'URL non valido' });
  }

  const allowedHosts = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
  ];
  let parsedUrl;
  try {
    parsedUrl = new URL(decoded);
  } catch {
    return res.status(400).json({ error: 'URL malformato' });
  }
  if (!allowedHosts.includes(parsedUrl.hostname)) {
    return res.status(403).json({ error: 'Host non autorizzato' });
  }

  // ── Fetch verso Yahoo Finance ────────────────────────────────────────────────
  try {
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Errore upstream', detail: err.message });
  }
}
