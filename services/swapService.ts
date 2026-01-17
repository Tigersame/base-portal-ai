import { formatUnits, parseUnits } from 'viem';
import { Token } from '../types';

const ZERO_X_PROXY_URL = '/api/swap-quote';
const ZERO_X_DIRECT_URL = 'https://base.api.0x.org/swap/v1/quote';
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const getZeroXApiKey = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('VITE_0X_API_KEY') || localStorage.getItem('zeroXKey');
  }
  return (import.meta as any).env?.VITE_0X_API_KEY as string | undefined;
};

type ZeroXQuoteResponse = {
  buyAmount: string;
  sellAmount: string;
  price: string;
  guaranteedPrice?: string;
  to: string;
  data: string;
  value?: string;
  gas?: string;
  sources?: Array<{ name: string; proportion: string }>;
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

const getRouteLabel = (sources?: Array<{ name: string; proportion: string }>) => {
  if (!sources || sources.length === 0) return '0x';
  const activeSources = sources
    .filter(source => Number(source.proportion) > 0)
    .sort((a, b) => Number(b.proportion) - Number(a.proportion))
    .slice(0, 3)
    .map(source => source.name);
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
    sellToken,
    buyToken,
    sellAmount,
    slippagePercentage: slippagePercentage.toString(),
  });
  if (takerAddress) {
    params.set('takerAddress', takerAddress);
  }

  try {
    const response = await fetch(`${ZERO_X_PROXY_URL}?${params.toString()}`, {
      headers: {
        '0x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('0x quote failed via proxy:', response.status, errorText);
      
      console.log('Trying direct API call...');
      const directResponse = await fetch(`${ZERO_X_DIRECT_URL}?${params.toString()}`, {
        headers: {
          '0x-api-key': apiKey,
        },
      });

      if (!directResponse.ok) {
        const directErrorText = await directResponse.text();
        console.error('0x quote failed via direct call:', directResponse.status, directErrorText);
        return null;
      }

      const data = (await directResponse.json()) as ZeroXQuoteResponse;
      return formatQuoteResponse(data, to, slippagePercentage);
    }

    const data = (await response.json()) as ZeroXQuoteResponse;
    return formatQuoteResponse(data, to, slippagePercentage);
  } catch (error) {
    console.error('Swap quote error:', error);
    return null;
  }
};

function formatQuoteResponse(
  data: ZeroXQuoteResponse,
  to: Token,
  slippagePercentage: number
): SwapQuote {
  const buyAmountFormatted = formatUnits(BigInt(data.buyAmount), to.decimals ?? 18);
  const price = Number(data.price);
  const guaranteed = Number(data.guaranteedPrice ?? data.price);
  const priceImpact = price > 0 ? ((price - guaranteed) / price) * 100 : 0;

  return {
    outputAmount: buyAmountFormatted,
    priceImpact: `${priceImpact.toFixed(2)}%`,
    route: getRouteLabel(data.sources),
    fee: '',
    slippage: `${(slippagePercentage * 100).toFixed(2)}%`,
    networkFeeUsd: '—',
    to: data.to,
    data: data.data,
    value: data.value,
    gas: data.gas,
  };
}
