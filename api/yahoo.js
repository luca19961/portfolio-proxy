// api/yahoo.js  — Vercel Serverless Function
// Proxy per Yahoo Finance + Loghi aziendali
export default async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Validazione parametro url ──
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Parametro url mancante' });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'URL non valido' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(decoded);
  } catch {
    return res.status(400).json({ error: 'URL malformato' });
  }

  // ── Whitelist: Yahoo Finance + servizi loghi ──
  const allowedHosts = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'logo.clearbit.com',
    'www.google.com',
  ];

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    return res.status(403).json({ error: 'Host non autorizzato' });
  }

  // ── Determina se è una richiesta immagine (logo) ──
  const isLogo = parsedUrl.hostname === 'logo.clearbit.com'
    || (parsedUrl.hostname === 'www.google.com' && parsedUrl.pathname.startsWith('/s2/favicons'));

  try {
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': isLogo
          ? 'image/webp,image/png,image/*,*/*'
          : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (isLogo) {
      // ── Risposta binaria (immagine) ──
      const contentType = upstream.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await upstream.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // cache 7 giorni
      return res.status(upstream.status).send(buffer);
    } else {
      // ── Risposta JSON (Yahoo Finance) ──
      const data = await upstream.json();
      res.setHeader('Cache-Control', 'public, max-age=30'); // cache 30 secondi
      return res.status(upstream.status).json(data);
    }
  } catch (err) {
    return res.status(502).json({ error: 'Errore upstream', detail: err.message });
  }
}
