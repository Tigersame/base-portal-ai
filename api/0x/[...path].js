module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, 0x-api-key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.ZERO_X_API_KEY || process.env.VITE_0X_API_KEY;
  if (!apiKey) {
    console.error('Missing 0x API key');
    res.status(500).json({ error: 'Missing 0x API key' });
    return;
  }

  try {
    const { path = [], ...rest } = req.query || {};
    const pathSegments = Array.isArray(path) ? path : [path];
    const targetUrl = new URL(`https://base.api.0x.org/${pathSegments.join('/')}`);

    Object.entries(rest).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => targetUrl.searchParams.append(key, String(entry)));
      } else if (value !== undefined) {
        targetUrl.searchParams.append(key, String(value));
      }
    });

    console.log('Proxying to:', targetUrl.toString());

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        '0x-api-key': apiKey,
      },
    });

    const body = await response.text();
    
    if (!response.ok) {
      console.error('0x API error:', response.status, body);
    }
    
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
};
