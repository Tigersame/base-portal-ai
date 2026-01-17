import { formatUnits, parseUnits } from 'viem';
import { Token } from '../types';
import { getUniswapQuote, UniswapQuote, SWAP_ROUTER_02 } from './uniswapService';

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
  isPriceOnly?: boolean;
  amountOutMinimum?: bigint;
  source: 'uniswap' | '0x';
};

export const getSwapQuote = async (
  from: Token,
  to: Token,
  amount: string,
  takerAddress?: string | null
): Promise<SwapQuote | null> => {
  if (!amount || Number(amount) <= 0) return null;
  if (!from.isNative && !from.address) return null;
  if (!to.isNative && !to.address) return null;

  const sellToken = from.isNative ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : from.address!;
  const buyToken = to.isNative ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : to.address!;

  if (sellToken.toLowerCase() === buyToken.toLowerCase()) {
    console.error('Cannot swap a token for itself');
    throw new Error('Cannot swap a token for itself. Please select different tokens.');
  }

  console.log('[Swap] Getting quote:', {
    from: from.symbol,
    to: to.symbol,
    amount,
    takerAddress,
  });

  try {
    const uniswapQuote = await getUniswapQuote(from, to, amount, takerAddress, 3);
    
    if (uniswapQuote) {
      console.log('[Swap] Uniswap V3 quote received:', uniswapQuote);
      return {
        outputAmount: uniswapQuote.outputAmount,
        priceImpact: uniswapQuote.priceImpact,
        route: uniswapQuote.route,
        fee: uniswapQuote.fee,
        slippage: uniswapQuote.slippage,
        networkFeeUsd: uniswapQuote.networkFeeUsd,
        to: uniswapQuote.to,
        data: uniswapQuote.data,
        value: uniswapQuote.value,
        gas: uniswapQuote.gas,
        isPriceOnly: false,
        amountOutMinimum: uniswapQuote.amountOutMinimum,
        source: 'uniswap',
      };
    }
  } catch (error) {
    console.warn('[Swap] Uniswap quote failed:', error);
  }

  throw new Error('Unable to get swap quote. No liquidity found on Uniswap V3.');
};

export { SWAP_ROUTER_02 };
