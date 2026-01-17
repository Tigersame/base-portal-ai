module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { address, name } = req.query;
    
    if (!address && !name) {
      res.status(400).json({ error: 'Missing address or name parameter' });
      return;
    }

    let targetUrl;
    if (name) {
      targetUrl = `https://api.coinbase.com/api/v1/domain/resolver?name=${encodeURIComponent(name)}`;
    } else {
      targetUrl = `https://api.coinbase.com/api/v1/domain/resolver?address=${encodeURIComponent(address)}`;
    }

    console.log('Proxying to Coinbase API:', targetUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const body = await response.text();
    console.log('Coinbase API Response Status:', response.status);
    
    res.status(response.status);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(body);
  } catch (error) {
    console.error('Coinbase proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
