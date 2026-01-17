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
    res.status(500).json({ error: 'Missing 0x API key. Please set ZERO_X_API_KEY in Vercel environment variables.' });
    return;
  }

  try {
    const { sellToken, buyToken, sellAmount, slippagePercentage, taker } = req.query;
    
    if (!sellToken || !buyToken || !sellAmount) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // 0x API v2 uses unified endpoint with chainId parameter
    const targetUrl = new URL('https://api.0x.org/swap/allowance-holder/quote');
    targetUrl.searchParams.set('chainId', '8453'); // Base chain
    targetUrl.searchParams.set('sellToken', sellToken);
    targetUrl.searchParams.set('buyToken', buyToken);
    targetUrl.searchParams.set('sellAmount', sellAmount);
    if (slippagePercentage) targetUrl.searchParams.set('slippagePercentage', slippagePercentage);
    if (taker) targetUrl.searchParams.set('taker', taker);

    console.log('Proxying to 0x API v2:', targetUrl.toString());

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
        'Content-Type': 'application/json',
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
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
