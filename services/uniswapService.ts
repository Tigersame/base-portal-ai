import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { Token } from '../types';

const QUOTER_V2 = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const SWAP_ROUTER_02 = '0x2626664c2603336E57B271c5C0b26F421741e481';
const WETH = '0x4200000000000000000000000000000000000006';
const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const FEE_TIERS = [500, 3000, 10000] as const;

const quoterAbi = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const swapRouterAbi = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'data', type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'unwrapWETH9',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
] as const;

const getClient = () => {
  const alchemyKey = typeof window !== 'undefined' 
    ? (window as any).__ALCHEMY_KEY__ || import.meta.env.VITE_ALCHEMY_API_KEY 
    : undefined;
  
  const rpcUrl = alchemyKey 
    ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://mainnet.base.org';

  return createPublicClient({
    chain: base,
    transport: http(rpcUrl, { timeout: 15000 }),
  });
};

export type UniswapQuote = {
  outputAmount: string;
  outputAmountRaw: bigint;
  priceImpact: string;
  route: string;
  fee: string;
  feeTier: number;
  slippage: string;
  networkFeeUsd: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  amountOutMinimum: bigint;
};

async function tryQuoteWithFee(
  client: ReturnType<typeof getClient>,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  fee: number
): Promise<{ amountOut: bigint; gasEstimate: bigint } | null> {
  try {
    const result = await client.simulateContract({
      address: QUOTER_V2,
      abi: quoterAbi,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: tokenIn as `0x${string}`,
          tokenOut: tokenOut as `0x${string}`,
          fee,
          amountIn,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const [amountOut, , , gasEstimate] = result.result;
    return { amountOut, gasEstimate };
  } catch (error) {
    console.log(`[Uniswap] Fee tier ${fee} not available:`, (error as Error).message?.slice(0, 50));
    return null;
  }
}

export async function getUniswapQuote(
  from: Token,
  to: Token,
  amount: string,
  takerAddress?: string | null,
  slippagePercent: number = 3
): Promise<UniswapQuote | null> {
  if (!amount || Number(amount) <= 0) return null;

  const client = getClient();
  
  const tokenIn = from.isNative ? WETH : from.address!;
  const tokenOut = to.isNative ? WETH : to.address!;
  
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    throw new Error('Cannot swap a token for itself');
  }

  const amountIn = parseUnits(amount, from.decimals ?? 18);

  console.log('[Uniswap] Quoting:', {
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    isNativeIn: from.isNative,
    isNativeOut: to.isNative,
  });

  let bestQuote: { amountOut: bigint; gasEstimate: bigint; fee: number } | null = null;

  for (const fee of FEE_TIERS) {
    const result = await tryQuoteWithFee(client, tokenIn, tokenOut, amountIn, fee);
    if (result && (!bestQuote || result.amountOut > bestQuote.amountOut)) {
      bestQuote = { ...result, fee };
    }
  }

  if (!bestQuote) {
    throw new Error('No liquidity found on Uniswap V3. Try a different token pair.');
  }

  const outputAmount = formatUnits(bestQuote.amountOut, to.decimals ?? 18);
  const slippageBps = BigInt(Math.round(slippagePercent * 100));
  const amountOutMinimum = (bestQuote.amountOut * (10000n - slippageBps)) / 10000n;

  const recipient = to.isNative ? SWAP_ROUTER_02 : (takerAddress || SWAP_ROUTER_02);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  const swapParams = {
    tokenIn: tokenIn as `0x${string}`,
    tokenOut: tokenOut as `0x${string}`,
    fee: bestQuote.fee,
    recipient: recipient as `0x${string}`,
    amountIn,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  };

  let callData: `0x${string}`;
  
  if (to.isNative) {
    const swapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [swapParams],
    });
    
    const unwrapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'unwrapWETH9',
      args: [amountOutMinimum, takerAddress as `0x${string}`],
    });
    
    callData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'multicall',
      args: [deadline, [swapCallData, unwrapCallData]],
    });
  } else {
    const swapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [{ ...swapParams, recipient: takerAddress as `0x${string}` }],
    });
    
    callData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'multicall',
      args: [deadline, [swapCallData]],
    });
  }

  const feeLabel = bestQuote.fee === 500 ? '0.05%' : bestQuote.fee === 3000 ? '0.3%' : '1%';

  return {
    outputAmount,
    outputAmountRaw: bestQuote.amountOut,
    priceImpact: '< 0.5%',
    route: `Uniswap V3 (${feeLabel})`,
    fee: feeLabel,
    feeTier: bestQuote.fee,
    slippage: `${slippagePercent}%`,
    networkFeeUsd: '~$0.01',
    to: SWAP_ROUTER_02,
    data: callData,
    value: from.isNative ? amountIn.toString() : '0',
    gas: (bestQuote.gasEstimate + 50000n).toString(),
    amountOutMinimum,
  };
}

export { SWAP_ROUTER_02, WETH, swapRouterAbi };
