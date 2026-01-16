module.exports = async function handler(req, res) {
  const apiKey = process.env.ZERO_X_API_KEY || process.env.VITE_0X_API_KEY;
  if (!apiKey) {
    res.status(500).json({ message: 'Missing 0x API key' });
    return;
  }

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

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    headers: {
      '0x-api-key': apiKey,
    },
  });

  const body = await response.text();
  res.status(response.status);
  res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
};
