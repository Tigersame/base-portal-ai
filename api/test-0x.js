module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.ZERO_X_API_KEY || process.env.VITE_0X_API_KEY;
  
  const result = {
    timestamp: new Date().toISOString(),
    apiKeyStatus: apiKey ? `Set (${apiKey.length} chars, starts with ${apiKey.substring(0, 4)}...)` : 'MISSING',
    envVars: {
      ZERO_X_API_KEY: process.env.ZERO_X_API_KEY ? 'set' : 'missing',
      VITE_0X_API_KEY: process.env.VITE_0X_API_KEY ? 'set' : 'missing',
    }
  };

  if (!apiKey) {
    result.error = 'No 0x API key found. Please set ZERO_X_API_KEY in Vercel environment variables.';
    result.instructions = [
      '1. Go to https://dashboard.0x.org/ and create/get your API key',
      '2. Go to Vercel Dashboard → Settings → Environment Variables',
      '3. Add ZERO_X_API_KEY with your 0x API key',
      '4. Redeploy the app'
    ];
    return res.status(200).json(result);
  }

  // Test the API key with a simple request
  try {
    const testUrl = 'https://api.0x.org/swap/allowance-holder/price?chainId=8453&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&buyToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&sellAmount=10000000000000000';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
      },
    });

    const body = await response.json();
    
    result.testRequest = {
      url: testUrl,
      status: response.status,
      response: body
    };

    if (body.liquidityAvailable === true) {
      result.status = 'SUCCESS - API key is working!';
    } else if (body.liquidityAvailable === false) {
      result.status = 'API responding but no liquidity - check API key permissions for Base chain';
      result.possibleIssues = [
        'API key may not have Base chain (8453) enabled',
        'API key may have rate limits or restrictions',
        'Try regenerating the API key from 0x dashboard'
      ];
    } else if (response.status === 401 || response.status === 403) {
      result.status = 'UNAUTHORIZED - API key is invalid or expired';
    } else {
      result.status = 'UNKNOWN - check response for details';
    }

  } catch (error) {
    result.error = error.message;
    result.status = 'ERROR - Failed to test API';
  }

  res.status(200).json(result);
};
