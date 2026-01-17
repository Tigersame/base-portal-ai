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

  // Log API key status (not the key itself)
  console.log('0x API Key status:', apiKey ? `Set (${apiKey.length} chars)` : 'Missing');

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
    // 0x API v2 uses slippageBps (basis points), not slippagePercentage
    // Convert from decimal (0.01 = 1%) to basis points (100 = 1%)
    if (slippagePercentage) {
      const slippageBps = Math.round(parseFloat(slippagePercentage) * 10000);
      targetUrl.searchParams.set('slippageBps', slippageBps.toString());
    }
    if (taker) targetUrl.searchParams.set('taker', taker);

    const fullUrl = targetUrl.toString();
    console.log('Proxying to 0x API v2:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
        'Content-Type': 'application/json',
      },
    });

    const body = await response.text();
    console.log('0x API Response Status:', response.status);
    console.log('0x API Response Body:', body);
    
    // Try to parse and add debug info
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      
      // Add debug info to response for troubleshooting
      if (parsedBody.liquidityAvailable === false) {
        console.warn('⚠️ 0x API: No liquidity available');
        console.warn('Issues object:', JSON.stringify(parsedBody.issues || {}, null, 2));
        console.warn('Full request URL:', fullUrl);
        console.warn('Request params:', {
          chainId: '8453',
          sellToken,
          buyToken, 
          sellAmount,
          taker,
          slippageBps: slippagePercentage ? Math.round(parseFloat(slippagePercentage) * 10000) : 'default'
        });
        
        // Add request info to response for debugging
        parsedBody._debug = {
          requestUrl: fullUrl.replace(apiKey, '***'),
          chainId: 8453,
          sellToken,
          buyToken,
          sellAmount,
          taker,
          apiKeySet: !!apiKey
        };
      }
      
      res.status(response.status);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.json(parsedBody);
    } catch (e) {
      console.error('Failed to parse 0x response:', e);
      res.status(response.status);
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
