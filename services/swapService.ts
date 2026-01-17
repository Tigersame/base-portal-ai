import { formatUnits, parseUnits } from 'viem';
import { Token } from '../types';

const ZERO_X_PROXY_URL = '/api/swap-quote';
const ZERO_X_PRICE_URL = '/api/swap-price';
const ZERO_X_DIRECT_URL = 'https://api.0x.org/swap/allowance-holder/quote';
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const BASE_CHAIN_ID = '8453';

const getZeroXApiKey = () => {
  // For proxied requests, the API key is handled by the backend
  // Only check localStorage for direct API access (not recommended)
  if (typeof localStorage !== 'undefined') {
    const localKey = localStorage.getItem('VITE_0X_API_KEY') || localStorage.getItem('zeroXKey');
    if (localKey) return localKey;
  }
  // Return a placeholder - the backend proxy will use the real key
  return 'PROXY';
};

// 0x API v2 response structure
type ZeroXQuoteResponseV2 = {
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
  buyAmount: string;
  sellAmount: string;
  liquidityAvailable: boolean;
  issues?: {
    allowance?: {
      spender: string;
      actual: string;
      expected: string;
    };
    balance?: {
      token: string;
      actual: string;
      expected: string;
    };
    invalidSourcesPassed?: string[];
    simulationIncomplete?: boolean;
  };
  route?: {
    fills: Array<{
      from: string;
      to: string;
      source: string;
      proportionBps: string;
    }>;
  };
};

// 0x API v2 price response (no transaction data, just pricing)
type ZeroXPriceResponseV2 = {
  buyAmount: string;
  sellAmount: string;
  liquidityAvailable: boolean;
  issues?: ZeroXQuoteResponseV2['issues'];
  route?: ZeroXQuoteResponseV2['route'];
};

export type SwapQuote = {
  outputAmount: string;
  priceImpact: string;
  route: string;
  fee: string;
  slippage: string;
  networkFeeUsd: string;
  to: string;
  data: string;
  value?: string;
  gas?: string;
  isPriceOnly?: boolean; // True if this is a price estimate without executable transaction
};

const getRouteLabel = (route?: { fills: Array<{ source: string; proportionBps: string }> }) => {
  if (!route || !route.fills || route.fills.length === 0) return '0x';
  const activeSources = route.fills
    .filter(fill => Number(fill.proportionBps) > 0)
    .sort((a, b) => Number(b.proportionBps) - Number(a.proportionBps))
    .slice(0, 3)
    .map(fill => fill.source);
  return activeSources.length ? activeSources.join(', ') : '0x';
};

export const getSwapQuote = async (
  from: Token,
  to: Token,
  amount: string,
  takerAddress?: string | null
): Promise<SwapQuote | null> => {
  const apiKey = getZeroXApiKey();
  if (!amount || Number(amount) <= 0) return null;
  if (!from.isNative && !from.address) return null;
  if (!to.isNative && !to.address) return null;

  const sellToken = from.isNative ? NATIVE_TOKEN_ADDRESS : from.address!;
  const buyToken = to.isNative ? NATIVE_TOKEN_ADDRESS : to.address!;
  const sellAmount = parseUnits(amount, from.decimals ?? 18).toString();
  const slippagePercentage = 0.03; // 3% slippage for better liquidity routing

  const params = new URLSearchParams({
    chainId: BASE_CHAIN_ID,
    sellToken,
    buyToken,
    sellAmount,
    slippagePercentage: slippagePercentage.toString(),
  });
  if (takerAddress) {
    params.set('taker', takerAddress);
  }

  console.log('[0x API Request]', {
    sellToken,
    buyToken,
    sellAmount,
    sellAmountInEth: amount,
    takerAddress,
    url: `${ZERO_X_PROXY_URL}?${params.toString()}`
  });

  try {
    // First try quote endpoint
    const response = await fetch(`${ZERO_X_PROXY_URL}?${params.toString()}`, {
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
      },
    });

    if (response.ok) {
      const data = (await response.json()) as ZeroXQuoteResponseV2;
      
      // If quote has liquidity, return it
      if (data.liquidityAvailable !== false) {
        return formatQuoteResponse(data, to, slippagePercentage, false);
      }
      
      // Quote returned but no liquidity - try price endpoint for estimate
      console.warn('Quote returned liquidityAvailable: false, trying price endpoint...');
    } else {
      const errorText = await response.text();
      console.error('0x quote failed:', response.status, errorText);
    }

    // Fallback: Try price endpoint for at least an estimate
    console.log('[0x API] Trying price endpoint fallback...');
    const priceResponse = await fetch(`${ZERO_X_PRICE_URL}?${params.toString()}`, {
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
      },
    });

    if (priceResponse.ok) {
      const priceData = (await priceResponse.json()) as ZeroXPriceResponseV2;
      console.log('[0x Price Response]', priceData);
      
      if (priceData.liquidityAvailable !== false && priceData.buyAmount) {
        // Return price-only estimate (not executable)
        return formatPriceResponse(priceData, to, slippagePercentage);
      }
    }

    // Both quote and price failed - throw descriptive error
    throw new Error('Unable to get swap quote. Please try a larger amount (min 0.01 ETH) or different token pair.');
    
  } catch (error) {
    console.error('Swap quote error:', error);
    if (error instanceof Error) {
      throw error;
    }
    return null;
  }
};

function formatPriceResponse(
  data: ZeroXPriceResponseV2,
  to: Token,
  slippagePercentage: number
): SwapQuote {
  const buyAmountFormatted = formatUnits(BigInt(data.buyAmount), to.decimals ?? 18);
  const sellAmountBigInt = BigInt(data.sellAmount);
  const buyAmountBigInt = BigInt(data.buyAmount);
  
  const priceImpact = sellAmountBigInt > 0n 
    ? Number((sellAmountBigInt - buyAmountBigInt) * 10000n / sellAmountBigInt) / 100
    : 0;

  return {
    outputAmount: buyAmountFormatted,
    priceImpact: `${Math.abs(priceImpact).toFixed(2)}%`,
    route: getRouteLabel(data.route),
    fee: '',
    slippage: `${(slippagePercentage * 100).toFixed(2)}%`,
    networkFeeUsd: '—',
    to: '',
    data: '',
    isPriceOnly: true, // Mark as price-only (not executable)
  };
}

function formatQuoteResponse(
  data: ZeroXQuoteResponseV2,
  to: Token,
  slippagePercentage: number,
  isPriceOnly: boolean
): SwapQuote {
  console.log('0x API Response:', data);
  
  if (data?.liquidityAvailable === false) {
    console.warn('0x API: No liquidity route found', data);
    
    const issues = data.issues || {};
    let errorMsg = 'No liquidity available. ';
    
    if (issues.balance) {
      errorMsg += `Insufficient balance: need ${issues.balance.expected} but have ${issues.balance.actual}. `;
    }
    if (issues.allowance) {
      errorMsg += `Token approval required for ${issues.allowance.spender}. `;
    }
    if (issues.simulationIncomplete) {
      errorMsg += 'Cannot verify trade simulation. ';
    }
    if (Object.keys(issues).length === 0) {
      errorMsg += 'Try increasing swap amount (min ~0.01 ETH) or use major tokens (ETH, USDC, WETH).';
    }
    
    throw new Error(errorMsg.trim());
  }
  
  if (!data || !data.buyAmount || !data.sellAmount || !data.transaction) {
    console.error('Invalid quote response:', data);
    throw new Error('Invalid quote response from 0x API');
  }

  const buyAmountFormatted = formatUnits(BigInt(data.buyAmount), to.decimals ?? 18);
  const sellAmountBigInt = BigInt(data.sellAmount);
  const buyAmountBigInt = BigInt(data.buyAmount);
  
  const priceImpact = sellAmountBigInt > 0n 
    ? Number((sellAmountBigInt - buyAmountBigInt) * 10000n / sellAmountBigInt) / 100
    : 0;

  return {
    outputAmount: buyAmountFormatted,
    priceImpact: `${Math.abs(priceImpact).toFixed(2)}%`,
    route: getRouteLabel(data.route),
    fee: '',
    slippage: `${(slippagePercentage * 100).toFixed(2)}%`,
    networkFeeUsd: '—',
    to: data.transaction.to,
    data: data.transaction.data,
    value: data.transaction.value,
    gas: data.transaction.gas,
    isPriceOnly,
  };
}
