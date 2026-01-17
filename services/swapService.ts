import { formatUnits, parseUnits } from 'viem';
import { Token } from '../types';

const ZERO_X_PROXY_URL = '/api/swap-quote';
const ZERO_X_DIRECT_URL = 'https://api.0x.org/swap/allowance-holder/quote';
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const BASE_CHAIN_ID = '8453';

const getZeroXApiKey = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('VITE_0X_API_KEY') || localStorage.getItem('zeroXKey');
  }
  return (import.meta as any).env?.VITE_0X_API_KEY as string | undefined;
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
    };
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
  if (!apiKey) {
    console.error('No 0x API key found');
    return null;
  }
  if (!amount || Number(amount) <= 0) return null;
  if (!from.isNative && !from.address) return null;
  if (!to.isNative && !to.address) return null;

  const sellToken = from.isNative ? NATIVE_TOKEN_ADDRESS : from.address!;
  const buyToken = to.isNative ? NATIVE_TOKEN_ADDRESS : to.address!;
  const sellAmount = parseUnits(amount, from.decimals ?? 18).toString();
  const slippagePercentage = 0.005;

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

  try {
    const response = await fetch(`${ZERO_X_PROXY_URL}?${params.toString()}`, {
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('0x quote failed via proxy:', response.status, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message?.includes('no Route matched') || !errorData.liquidityAvailable) {
          console.error('No liquidity route found. Try increasing the swap amount (minimum ~0.001 ETH or $3 equivalent).');
        }
      } catch (e) {
        // Error text wasn't JSON, ignore
      }
      
      console.log('Trying direct API call...');
      const directResponse = await fetch(`${ZERO_X_DIRECT_URL}?${params.toString()}`, {
        headers: {
          '0x-api-key': apiKey,
          '0x-version': 'v2',
        },
      });

      if (!directResponse.ok) {
        const directErrorText = await directResponse.text();
        console.error('0x quote failed via direct call:', directResponse.status, directErrorText);
        return null;
      }

      const data = (await directResponse.json()) as ZeroXQuoteResponseV2;
      return formatQuoteResponse(data, to, slippagePercentage);
    }

    const data = (await response.json()) as ZeroXQuoteResponseV2;
    return formatQuoteResponse(data, to, slippagePercentage);
  } catch (error) {
    console.error('Swap quote error:', error);
    return null;
  }
};

function formatQuoteResponse(
  data: ZeroXQuoteResponseV2,
  to: Token,
  slippagePercentage: number
): SwapQuote {
  const buyAmountFormatted = formatUnits(BigInt(data.buyAmount), to.decimals ?? 18);
  const sellAmountBigInt = BigInt(data.sellAmount);
  const buyAmountBigInt = BigInt(data.buyAmount);
  
  // Calculate price impact based on buy/sell ratio
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
  };
}
